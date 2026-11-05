import {
  RETRIEVE_EXCERPT_CHARS,
  RETRIEVE_MIN_KEYWORD_FOR_HYBRID,
  RETRIEVE_MIN_SCORE,
  RETRIEVE_MIN_SCORE_PINNED,
  RETRIEVE_MIN_SEMANTIC_ALONE,
  RETRIEVE_MIN_SEMANTIC_PINNED,
  RETRIEVE_TOP_K,
} from "./assistant.constants.js";
import { foldVietnamese } from "./assistant.extract.js";
import * as indexRepository from "./assistant.index.repository.js";

/** Function words that match almost every Vietnamese note if scored as content terms. */
const STOPWORDS = new Set([
  "va",
  "la",
  "cua",
  "cho",
  "voi",
  "cac",
  "mot",
  "nhung",
  "thi",
  "nay",
  "kia",
  "do",
  "de",
  "tu",
  "tren",
  "trong",
  "ra",
  "vao",
  "khi",
  "neu",
  "nhu",
  "hay",
  "bi",
  "duoc",
  "rat",
  "qua",
  "hon",
  "ve",
  "o",
  "tai",
  "bang",
  "hoac",
  "toi",
  "ban",
  "minh",
  "the",
  "ai",
  "gi",
  "nao",
  "sao",
  "vi",
  "ma",
  "se",
  "dang",
  "da",
  "can",
  "nen",
  "phai",
  "cung",
  "du",
  "chi",
  "ca",
  "nhat",
  "nhieu",
  "it",
  "moi",
  "nhung",
  "nhung",
  // "bao gồm" / filler around list questions
  "bao",
  "gom",
  "gom",
  "nhung",
  "dang",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "a",
  "an",
  "is",
  "are",
  "be",
  "as",
  "at",
  "by",
  "from",
  "with",
  "this",
  "that",
  "it",
  "you",
  "we",
  "they",
  "i",
  "my",
  "your",
]);

export const tokenize = (text) =>
  foldVietnamese(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);

export const contentTerms = (text) =>
  tokenize(text).filter((token) => !STOPWORDS.has(token));

/** Soft expansions so VI↔EN questions still hit the other language's wording. */
const TERM_EXPANSIONS = {
  technical: ["skills", "languages", "tools"],
  skill: ["skills", "technical"],
  skills: ["technical", "languages", "tools"],
  cv: ["resume", "curriculum"],
  resume: ["cv"],
  kynang: ["skills", "technical"],
  // CV / job intent (VI mixed with EN loanwords)
  role: ["engineer", "position", "title", "job", "vitri"],
  apply: ["application", "applying", "seeking", "candidate", "engineer", "position"],
  applying: ["apply", "application", "seeking"],
  position: ["role", "title", "job", "engineer"],
  job: ["role", "position", "title", "engineer"],
  title: ["role", "position", "engineer"],
  vitri: ["role", "position", "title", "job"],
  // EN → VI (study / syllabus)
  biology: ["sinh", "hoc"],
  grade: ["lop", "khoi"],
  level: ["lop", "trinh"],
  subject: ["mon", "hoc"],
  curriculum: ["cuong", "de"],
  syllabus: ["cuong", "de"],
  intended: ["danh", "tuong"],
  student: ["hoc", "sinh"],
  students: ["hoc", "sinh"],
  // VI → EN
  sinh: ["biology", "biological"],
  lop: ["grade", "class", "level"],
  cuong: ["curriculum", "syllabus", "outline"],
  mon: ["subject", "course"],
};

export const expandQueryTerms = (terms) => {
  const out = [...terms];
  const seen = new Set(terms);
  for (const term of terms) {
    for (const extra of TERM_EXPANSIONS[term] || []) {
      if (!seen.has(extra)) {
        seen.add(extra);
        out.push(extra);
      }
    }
  }
  return out;
};

const termWeight = (term) => Math.min(3, Math.max(1, term.length / 3));

const buildPositions = (tokens) => {
  const map = new Map();
  tokens.forEach((token, index) => {
    if (!map.has(token)) map.set(token, []);
    map.get(token).push(index);
  });
  return map;
};

const areNear = (positionsA = [], positionsB = [], window = 2) => {
  for (const a of positionsA) {
    for (const b of positionsB) {
      if (Math.abs(a - b) <= window) return true;
    }
  }
  return false;
};

/**
 * Whole-token keyword score with stopword removal + proximity for adjacent query terms.
 * Avoids substring false positives (e.g. "ra" inside words, "sinh" from "sinh viên" alone).
 * @param {string} chunkText
 * @param {string} query
 * @param {{ title?: string|null }} [options]
 */
export const scoreChunk = (chunkText, query, { title = null } = {}) => {
  const passageSource = title ? `${title}\n${chunkText}` : chunkText;
  const passageTokens = tokenize(passageSource);
  const queryTokens = tokenize(query);
  if (passageTokens.length === 0 || queryTokens.length === 0) return 0;

  let originalTerms = contentTerms(query);
  if (originalTerms.length === 0) originalTerms = queryTokens;
  const expanded = expandQueryTerms(originalTerms);
  const expansionOnly = expanded.filter((term) => !originalTerms.includes(term));

  const positions = buildPositions(passageTokens);
  let weightSum = 0;
  let matchedWeight = 0;
  let matched = 0;

  // Denominator = original query terms only (expansions must not dilute the score).
  for (const term of originalTerms) {
    const weight = termWeight(term);
    weightSum += weight;
    if (positions.has(term)) {
      matched += 1;
      matchedWeight += weight;
    }
  }

  let expansionHits = 0;
  for (const term of expansionOnly) {
    if (positions.has(term)) expansionHits += 1;
  }

  if (matched === 0 && expansionHits === 0) return 0;
  if (weightSum === 0) return 0;

  let score = matchedWeight / weightSum;

  // Adjacent original terms should appear near each other (skip when synonyms already rescue the hit).
  let pairHits = 0;
  let pairTotal = 0;
  for (let i = 0; i < originalTerms.length - 1; i += 1) {
    const left = originalTerms[i];
    const right = originalTerms[i + 1];
    if (!positions.has(left) && !positions.has(right)) continue;
    pairTotal += 1;
    if (areNear(positions.get(left), positions.get(right), 2)) pairHits += 1;
  }
  if (pairTotal > 0 && expansionHits === 0) {
    score = score * 0.65 + (pairHits / pairTotal) * 0.35;
    // Scattered tokens without any nearby pair (e.g. "sinh" in "sinh viên" + "học" elsewhere) are weak.
    if (pairHits === 0 && originalTerms.length >= 3) {
      score *= 0.45;
    }
  }

  if (originalTerms.length >= 3 && matched === 1 && expansionHits === 0) {
    score *= 0.4;
  } else if (originalTerms.length >= 4 && matched === 2 && expansionHits === 0) {
    score *= 0.7;
  }

  // Matched translations / synonyms add a capped bonus (after penalties so they can rescue the hit).
  if (expansionHits > 0) {
    score = Math.min(1, score + Math.min(0.5, expansionHits * 0.14));
  }

  const passageJoined = passageTokens.join(" ");
  const queryFolded = queryTokens.join(" ");
  if (queryFolded.length >= 8 && passageJoined.includes(queryFolded)) {
    score = Math.min(1, score + 0.3);
  }

  // Strong boost when a known section heading matches the intent (e.g. Technical Skills).
  if (
    passageJoined.includes("technical skills") &&
    (positions.has("technical") || positions.has("skills"))
  ) {
    const asksSkills =
      originalTerms.includes("technical") ||
      originalTerms.includes("skills") ||
      originalTerms.includes("skill");
    if (asksSkills) score = Math.min(1, score + 0.25);
  }

  return Math.min(1, score);
};

export const cosineSimilarity = (a, b) => {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
};

const applySubjectBoost = (score, chunk, question) => {
  const subjectName = chunk.content?.subject?.name;
  if (!subjectName) return score;
  const foldedSubject = foldVietnamese(subjectName);
  const foldedQuestion = foldVietnamese(question);
  if (foldedSubject.length >= 3 && foldedQuestion.includes(foldedSubject)) {
    return Math.min(1, score + 0.12);
  }
  return score;
};

/**
 * Prefer a window around query terms. Avoids sending only the chunk header when the
 * match (e.g. "Hybrid Processing") sits near the end of a long passage.
 */
export const buildExcerpt = (chunkText, query, maxLen = RETRIEVE_EXCERPT_CHARS) => {
  const text = String(chunkText ?? "");
  if (!text) return "";
  if (text.length <= maxLen) return text;

  const foldedText = foldVietnamese(text);
  const terms = expandQueryTerms(contentTerms(query));
  let bestStart = 0;
  let bestScore = -1;

  for (const term of terms) {
    if (!term || term.length < 2) continue;
    let from = 0;
    while (from < foldedText.length) {
      const at = foldedText.indexOf(term, from);
      if (at < 0) break;
      let local = term.length;
      // Prefer denser matches: nearby sibling terms in a small window.
      const window = foldedText.slice(Math.max(0, at - 40), at + term.length + 80);
      for (const other of terms) {
        if (other !== term && window.includes(other)) local += other.length;
      }
      if (local > bestScore) {
        bestScore = local;
        bestStart = at;
      }
      from = at + term.length;
    }
  }

  if (bestScore < 0) return text.slice(0, maxLen);

  // Map folded offset → original offset approximately (same length for VI fold of letters).
  const center = Math.min(text.length, bestStart);
  const lead = Math.floor(maxLen / 3);
  let start = Math.max(0, center - lead);
  let end = Math.min(text.length, start + maxLen);
  start = Math.max(0, end - maxLen);

  // Snap to nearby newline so we rarely start mid-word.
  const snap = text.lastIndexOf("\n", start);
  if (snap > start - 80 && snap >= 0) start = snap + 1;
  end = Math.min(text.length, start + maxLen);

  let excerpt = text.slice(start, end).trim();
  if (start > 0) excerpt = `…${excerpt}`;
  if (end < text.length) excerpt = `${excerpt}…`;
  return excerpt;
};

/**
 * Keyword retrieval over indexed chunks in scope (P2).
 * Embedding re-rank is applied when vectors exist (same model).
 */
export const retrieveChunks = async (userId, scope, question, { queryEmbedding = null } = {}) => {
  const contentIds = await indexRepository.listSearchableContentIds(userId, scope);
  if (contentIds.length === 0) return { contentIds, hits: [] };

  // User explicitly pinned one file — prefer returning its best chunks over empty not_found.
  const pinnedSingleDoc = contentIds.length === 1;
  const minScore = pinnedSingleDoc ? RETRIEVE_MIN_SCORE_PINNED : RETRIEVE_MIN_SCORE;
  const minSemanticAlone = pinnedSingleDoc
    ? RETRIEVE_MIN_SEMANTIC_PINNED
    : RETRIEVE_MIN_SEMANTIC_ALONE;

  const chunks = await indexRepository.listChunksForContents(userId, contentIds);
  const prelim = chunks.map((chunk) => {
    const keywordScore = scoreChunk(chunk.chunkText, question, {
      title: chunk.content?.title,
    });
    let semantic = 0;
    if (queryEmbedding && chunk.embedding?.length) {
      semantic = cosineSimilarity(queryEmbedding, chunk.embedding);
    }
    return { chunk, keywordScore, semantic };
  });

  const maxSemantic = prelim.reduce((max, item) => Math.max(max, item.semantic), 0);

  let scored = prelim
    .map((item) => {
      let score = item.keywordScore;
      if (queryEmbedding && item.chunk.embedding?.length) {
        const { keywordScore, semantic } = item;
        // Pure-semantic: require a strong absolute score AND near the best match in-scope.
        const semanticAloneOk =
          semantic >= minSemanticAlone && semantic >= maxSemantic - 0.015;
        if (keywordScore < RETRIEVE_MIN_KEYWORD_FOR_HYBRID && !semanticAloneOk) {
          score = 0;
        } else {
          score = 0.6 * semantic + 0.4 * keywordScore;
        }
      }
      score = applySubjectBoost(score, item.chunk, question);
      return { chunk: item.chunk, score, keywordScore: item.keywordScore };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVE_TOP_K);

  // Last resort for a pinned doc: still surface the strongest in-doc chunk(s).
  if (pinnedSingleDoc && scored.length === 0 && prelim.length > 0) {
    scored = [...prelim]
      .map((item) => ({
        chunk: item.chunk,
        score: Math.max(item.keywordScore, item.semantic * 0.6),
        keywordScore: item.keywordScore,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, RETRIEVE_TOP_K));
  }

  const hits = scored.map((item, index) => ({
    index: index + 1,
    documentId: item.chunk.contentId,
    documentTitle: item.chunk.content?.title ?? "Document",
    subjectName: item.chunk.content?.subject?.name ?? null,
    chunkId: item.chunk.id,
    excerpt: buildExcerpt(item.chunk.chunkText, question),
    location: item.chunk.location,
    score: Math.round(item.score * 100) / 100,
  }));

  return { contentIds, hits };
};

export const buildExtractiveAnswer = (hits) => {
  const lines = hits.map((hit) => `- ${hit.excerpt} [${hit.index}]`);
  return `Dựa trên tài liệu của bạn:\n${lines.join("\n")}`;
};
