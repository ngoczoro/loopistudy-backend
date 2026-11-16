const PAIR_PATTERN = /^[-*•]?\s*(.{2,80}?)\s*(?::|—|–)\s+(.{8,})$/;
const DEFINITION_PATTERN =
  /^[-*•]?\s*(.{2,80}?)\s+(?:là|is|are|means|refers to)\s+(.{8,})$/i;

const toPlainText = (value) =>
  String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\r/g, "")
    .trim();

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const stripMarker = (line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+[\).]\s*/, "").trim();

const LABEL_END = String.raw`(?=$|[\s:(])`;

// Numbered structure of the document, not concepts: "Bài 5", "Chương 3", "CLO 2", "Week 4", "II".
const STRUCTURE_LABEL = new RegExp(
  String.raw`^(?:bài|chương|phần|mục|tiết|tuần|buổi|học phần|clo|plo|chapter|lesson|unit|section|part|week|module|topic)\s*(?:\d+|[ivxlc]+)[a-z]?\.?$`,
  "iu",
);
const ROMAN_OR_NUMBER = /^(?:\d+|[ivxlc]+)[.)]?$/iu;

// Fields describing the course sheet itself (level, goals, notes, sources). Words that are also
// subject concepts ("đối tượng" = object in OOP, "hình thức", "thời gian") are left out on purpose.
const META_LABEL = new RegExp(
  String.raw`^(?:trình độ|mục tiêu|lưu ý|chú ý|ghi chú|source|tài liệu tham khảo|giảng viên|mã môn|mã học phần|số tín chỉ|thời lượng|note|notes|author|date|objectives?|prerequisites?|credits?|instructor|references?)${LABEL_END}`,
  "iu",
);

// "Tế bào nhân sơ (Cấu tạo đơn giản của vi khuẩn)" -> concept + gloss.
const GLOSS_PATTERN = /^(.{2,80}?)\s*\(([^()]{8,})\)\.?$/u;
// Syllabus glosses tell the student what to do, they are not knowledge.
const INSTRUCTION_GLOSS =
  /^(?:nhận biết|mô tả|khái niệm|không|chỉ|cách|mức độ|sơ lược|từ|giới thiệu|ôn tập|overview|introduction|intro)|mức độ|không học|yêu cầu/iu;

const isAllCapsTitle = (term) => {
  const letters = term.replace(/[^\p{L}]/gu, "");
  return term.split(/\s+/).length >= 2 && letters.length >= 4 && letters === letters.toUpperCase();
};

/** True for labels such as "Bài 5", "CLO 2", "Đối tượng" or an all-caps title. */
export const isStructuralTerm = (term) => {
  const value = clean(term);
  return (
    STRUCTURE_LABEL.test(value) ||
    ROMAN_OR_NUMBER.test(value) ||
    // "Ghi chú (Note)" style glossed terms are concepts being explained, not sheet fields.
    (META_LABEL.test(value) && !value.includes("(")) ||
    isAllCapsTitle(value)
  );
};

/**
 * Facts plus whether the text reads like a course outline (mostly "Bài 1: …", "CLO 2: …" lines).
 * An outline names topics without teaching them, so it has nothing to quiz on.
 */
const scanFacts = (raw) => {
  const text = toPlainText(raw);
  if (!text) return { facts: [], outline: false };

  const facts = [];
  const seen = new Set();
  let heading = null;
  let structural = 0;

  const push = ({ term, definition, sentence }) => {
    const nextSentence = clean(sentence);
    const nextDefinition = clean(definition);
    const nextTerm = clean(term) || null;
    if (nextSentence.length < 12 || nextDefinition.length < 8) return;
    if (nextTerm && nextTerm.toLowerCase() === nextDefinition.toLowerCase()) return;
    const key = nextSentence.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    facts.push({
      term: nextTerm && nextTerm.length <= 80 ? nextTerm : null,
      definition: nextDefinition.slice(0, 400),
      sentence: nextSentence.slice(0, 500),
      heading,
    });
  };

  // "Bài 5: Tế bào nhân sơ (…)" keeps the concept if the gloss is real content;
  // "Chương 3: Cấu trúc tế bào" only becomes the heading for the facts below it.
  const pushLabelled = (term, definition, sentence) => {
    if (!isStructuralTerm(term)) {
      push({ term, definition, sentence });
      return;
    }
    structural += 1;
    const gloss = clean(definition).match(GLOSS_PATTERN);
    if (gloss && STRUCTURE_LABEL.test(clean(term)) && !INSTRUCTION_GLOSS.test(gloss[2])) {
      push({ term: gloss[1], definition: gloss[2], sentence });
    } else if (STRUCTURE_LABEL.test(clean(term))) {
      heading = clean(definition).slice(0, 120);
    }
  };

  for (const block of text.split(/\n{2,}/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (
      lines.length === 1 &&
      lines[0].length <= 80 &&
      !/[.?!]$/.test(lines[0]) &&
      !PAIR_PATTERN.test(lines[0]) &&
      !DEFINITION_PATTERN.test(lines[0])
    ) {
      heading = lines[0].replace(/^#+\s*/, "").slice(0, 120);
      continue;
    }

    for (const line of lines) {
      if (/^#{1,6}\s+/.test(line)) {
        heading = line.replace(/^#{1,6}\s+/, "").slice(0, 120);
        continue;
      }

      const source = stripMarker(line);
      const pair = source.match(PAIR_PATTERN);
      if (pair && !/^https?:/i.test(pair[1])) {
        pushLabelled(pair[1], pair[2], source);
        continue;
      }

      const defined = source.match(DEFINITION_PATTERN);
      if (defined && !/^https?:/i.test(defined[1])) {
        pushLabelled(defined[1], defined[2], source);
        continue;
      }

      if (source.length >= 40) {
        push({ term: null, definition: source, sentence: source });
      }
    }
  }

  const termed = facts.filter((fact) => fact.term).length;
  return { facts, outline: structural >= 5 && structural >= 2 * termed };
};

/** True when the text is mostly a course outline or table of contents. */
export const isOutlineText = (raw) => scanFacts(raw).outline;

/**
 * Pull term/definition facts out of a student's note or file.
 * Every fact keeps the source sentence the checker can require later.
 * An outline yields no facts: its leftover lines are not worth quizzing on.
 */
export const extractFacts = (raw, { limit = 30 } = {}) => {
  const { facts, outline } = scanFacts(raw);
  if (outline) return [];
  return facts.slice(0, limit).map((fact, index) => ({
    ...fact,
    id: `f${index + 1}`,
  }));
};

/**
 * Round-robin over per-source fact lists so one long source cannot fill the quota.
 * Ids are reassigned because each source numbers its facts from f1.
 */
const interleaveFacts = (perSource, limit) => {
  const facts = [];
  const seen = new Set();

  for (let round = 0; facts.length < limit; round += 1) {
    let took = false;
    for (const list of perSource) {
      if (facts.length >= limit) break;
      const fact = list[round];
      if (!fact) continue;
      took = true;
      const key = fact.sentence.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push(fact);
    }
    if (!took) break;
  }

  return facts.map((fact, index) => ({ ...fact, id: `f${index + 1}` }));
};

/** Facts from several notes/files, balanced across them. */
export const extractFactsFromSources = (sources, { limit = 30 } = {}) =>
  interleaveFacts(
    sources.map((raw) => extractFacts(raw, { limit })),
    limit,
  );

/**
 * Most relevant facts by `scores` (same order as `facts`), best first.
 * Drops facts scoring more than `margin` below the best, but always keeps `min`
 * so the quiz still has enough questions and distractors.
 * The default margin suits multilingual-e5, whose cosine scores sit in a narrow ~0.8–0.9 band.
 */
export const keepTopFacts = (facts, scores, { min = 8, max = 30, margin = 0.03 } = {}) => {
  const ranked = facts
    .map((fact, index) => ({ fact, score: scores[index] ?? 0, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const best = ranked[0]?.score ?? 0;
  const kept = ranked.filter((entry, position) => position < min || entry.score >= best - margin);
  return kept.slice(0, max).map((entry, index) => ({ ...entry.fact, id: `f${index + 1}` }));
};

const matchKey = (value) => clean(toPlainText(value)).toLowerCase();

/**
 * Facts that sit entirely inside the given passages (e.g. search hits for a topic).
 * Facts come from each full document, so a passage cut mid-line never yields a partial fact.
 *
 * @param {{ id: string, text: string }[]} documents full text per note/file
 * @param {{ contentId: string, chunkText: string, score: number }[]} passages best first
 */
export const selectFactsInPassages = (documents, passages, { limit = 30 } = {}) => {
  const ranked = documents
    .map((doc) => {
      const docPassages = passages
        .filter((passage) => passage.contentId === doc.id)
        .map((passage) => ({ key: matchKey(passage.chunkText), score: passage.score }));
      if (!docPassages.length) return null;

      const facts = extractFacts(doc.text, { limit: 500 })
        .map((fact, index) => {
          const sentence = fact.sentence.toLowerCase();
          const scores = docPassages
            .filter((passage) => passage.key.includes(sentence))
            .map((passage) => passage.score);
          return scores.length ? { fact, index, score: Math.max(...scores) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map((entry) => entry.fact);

      return { facts, best: Math.max(...docPassages.map((passage) => passage.score)) };
    })
    .filter((entry) => entry?.facts.length)
    .sort((a, b) => b.best - a.best);

  return interleaveFacts(
    ranked.map((entry) => entry.facts),
    limit,
  );
};
