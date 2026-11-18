import { getOpenAIConfig } from "../ai/ai.constants.js";
import { generateJson } from "../ai/services/ai.provider.service.js";
import { completeJson, ollamaModelName } from "./ollama.js";
import { buildClozeCards, buildSentenceQuestions, sentenceQuestionIsGrounded } from "./sentence-items.js";
import { buildListCards, buildListQuestions, listQuestionIsGrounded } from "./list-items.js";
import { buildReasoningQuestions, reasoningQuestionIsGrounded } from "./reasoning-items.js";

const LETTERS = ["A", "B", "C", "D"];

const levelAt = (index, total, mode) => {
  if (mode === "easy" || mode === "medium" || mode === "hard") return mode;
  if (total <= 1) return "medium";
  const ratio = index / (total - 1);
  if (ratio < 0.34) return "easy";
  if (ratio < 0.67) return "medium";
  return "hard";
};

export const normalizeStudyText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const shuffle = (items, random = Math.random) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

export const answerTextForFact = (fact) => {
  const definition = String(fact?.definition ?? "").replace(/\s+/g, " ").trim();
  if (definition.length >= 8) return definition.slice(0, 280);
  return String(fact?.sentence ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
};

const usableTerm = (fact) => {
  const term = String(fact?.term ?? "").replace(/\s+/g, " ").trim();
  if (!term || term.length > 48 || /[.?!/{};]/.test(term) || term.startsWith("//")) return null;
  return term;
};

const headingHint = (heading) =>
  String(heading ?? "")
    .replace(/^#+\s*/, "")
    .replace(/^\d+(?:\.\d+)*\.?\s*/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isVietnamese = (fact) =>
  /[ăâêôơưđáàảãạắằấầéèẹẻẽíìịỉĩóòọỏõúùụủũýỳỵỷỹ]/i.test(
    `${fact?.term ?? ""} ${fact?.definition ?? ""} ${fact?.sentence ?? ""}`,
  );

const termCounts = (facts) => {
  const counts = new Map();
  for (const fact of facts) {
    const term = usableTerm(fact);
    if (!term) continue;
    const key = normalizeStudyText(term);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
};

/** Repeated labels such as "Lợi ích" keep the section name so the question is specific. */
export const labelForFact = (fact, counts) => {
  const term = usableTerm(fact);
  if (!term) return null;
  const hint = headingHint(fact.heading);
  if ((counts.get(normalizeStudyText(term)) || 0) > 1 && hint) {
    return `${term} — ${hint}`;
  }
  return term;
};

const substantiveAnswer = (fact) => {
  const text = answerTextForFact(fact);
  return text.split(/\s+/).filter(Boolean).length >= 5;
};

const relatedDistractor = (fact, correctFact) =>
  Boolean(
    (fact.heading && fact.heading === correctFact.heading) ||
      (usableTerm(fact) &&
        normalizeStudyText(usableTerm(fact)) === normalizeStudyText(usableTerm(correctFact))),
  );

const difficultyFromDistractors = (mode, correctFact, distractorFacts) => {
  if (mode === "easy" || mode === "medium" || mode === "hard") return mode;
  const related = distractorFacts.filter((fact) => relatedDistractor(fact, correctFact)).length;
  if (related >= 2) return "hard";
  if (related === 1) return "medium";
  return "easy";
};

const templateQuestion = (fact, difficulty, label) => {
  if (label && isVietnamese(fact)) {
    const parts = label.split(" — ");
    if (parts.length === 2) return `${parts[0]} của ${parts[1]} là gì?`;
    return `${label} có nghĩa là gì?`;
  }
  if (label && difficulty === "easy") {
    return `Which statement defines "${label}"?`;
  }
  if (label && difficulty === "hard") {
    return `Which statement is the right account of "${label}"?`;
  }
  if (label) return `Which idea matches "${label}"?`;
  if (isVietnamese(fact)) return "Câu nào dưới đây đúng với ghi chú?";
  return "Which of these statements is the one from your notes?";
};

const spoilsAnswer = (question, answer) => {
  const stem = normalizeStudyText(question);
  const key = normalizeStudyText(answer);
  if (!stem || key.length < 12) return false;
  return stem.includes(key);
};

const questionText = (item) => {
  const raw = typeof item === "string" ? item : item?.question ?? item?.q ?? item?.text ?? item?.front ?? "";
  return String(raw)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+[\).\]]\s*/, "")
    .slice(0, 400);
};

const stemFits = (question, fact, label) => {
  if (!question || spoilsAnswer(question, answerTextForFact(fact))) return false;
  const stem = normalizeStudyText(question);
  if (stem.length < 8) return false;
  const term = usableTerm(fact);
  if (!term) return /[?？]/.test(question);
  if (!stem.includes(normalizeStudyText(term))) return false;
  const parts = label?.split(" — ") ?? [];
  if (parts.length === 2) {
    const hintWords = normalizeStudyText(parts[1])
      .split(" ")
      .filter((word) => word.length >= 4 && word !== "tính");
    if (hintWords.length > 0 && !hintWords.some((word) => stem.includes(word))) return false;
  }
  return true;
};

const modelQuestionList = (json) => {
  if (Array.isArray(json?.questions)) return json.questions;
  if (Array.isArray(json?.cards)) return json.cards;
  if (Array.isArray(json)) return json;
  return [];
};

/**
 * qwen2.5:3b often drops factId and also reorders the questions.
 * A question is kept only when its wording names that fact's label.
 */
export const questionsFromModelJson = (json, targets) => {
  const map = new Map();
  const unused = [...targets];

  for (const item of modelQuestionList(json)) {
    const question = questionText(typeof item === "object" && item?.front && !item?.question
      ? { ...item, question: item.front }
      : item);
    if (!question) continue;
    const rawId = typeof item === "object" && item
      ? String(item.factId ?? item.fact_id ?? item.id ?? "").trim().toLowerCase()
      : "";
    const byId = rawId
      ? unused.find((target) => {
          const id = String(target.fact?.id ?? target.id ?? "").toLowerCase();
          return rawId === id || rawId === id.replace(/^f/, "");
        })
      : null;
    const match = [byId, ...unused].find((target) => {
      if (!target) return false;
      const fact = target.fact ?? target;
      return stemFits(question, fact, target.label ?? null);
    });
    const factId = match?.fact?.id ?? match?.id;
    if (!factId || map.has(factId)) continue;
    map.set(factId, question);
    const usedIndex = unused.indexOf(match);
    if (usedIndex >= 0) unused.splice(usedIndex, 1);
  }
  return map;
};

const tagWording = (map, provider, model) => {
  map.wordingProvider = provider;
  map.wordingModel = model;
  return map;
};

/** Ollama first. A thrown error tries OpenAI with the same prompt. */
export const wordingFromModels = async ({ askOllama, askOpenAI, targets }) => {
  try {
    const json = await askOllama();
    return tagWording(questionsFromModelJson(json, targets), "ollama", ollamaModelName());
  } catch (error) {
    console.warn("Study wording Ollama failed, trying OpenAI:", error.message);
    const json = await askOpenAI();
    return tagWording(
      questionsFromModelJson(json, targets),
      "openai",
      getOpenAIConfig().model,
    );
  }
};

const askOllamaJson = async ({ system, user, numPredict }) => {
  const { json } = await completeJson({ system, user, numPredict });
  return json;
};

const askOpenAIJson = ({ system, user, numPredict }) =>
  generateJson({
    instructions: system,
    input: user,
    temperature: 0.4,
    maxOutputTokens: numPredict,
  });

const rewriteWithModels = (targets, { system, user, numPredict }) =>
  wordingFromModels({
    targets,
    askOllama: () => askOllamaJson({ system, user, numPredict }),
    askOpenAI: () => askOpenAIJson({ system, user, numPredict }),
  });

async function rewriteQuestionsWithOllama(targets) {
  const system = `Bạn viết câu hỏi ôn tập từ ghi chú của sinh viên.
Mỗi khối là một fact. Viết đúng một câu hỏi cho khối đó, theo đúng thứ tự các khối.
Dùng cùng ngôn ngữ với fact. Câu hỏi phải nhắc đúng nhãn, không đánh số, không chép định nghĩa.
Trả về JSON dạng {"questions":["câu hỏi","câu hỏi"]}. Số phần tử bằng số khối.`;

  const user = targets
    .map((item) => {
      const label = item.label || item.fact.term || item.fact.id;
      return `Nhãn: ${label}\nĐịnh nghĩa: ${answerTextForFact(item.fact)}`;
    })
    .join("\n\n");

  return rewriteWithModels(targets, {
    system,
    user,
    numPredict: Math.min(1800, 200 + targets.length * 120),
  });
}

/**
 * Four options for a definition question. `preferRelated` (default) tries distractors from the
 * same term or section first, which are hard to tell apart; false tries other sections first
 * (an easy quiz). The question's level is then read from what was actually picked.
 */
export const buildOptions = (
  correctFact,
  pool,
  random = Math.random,
  blocked = new Set(),
  preferRelated = true,
) => {
  const correct = answerTextForFact(correctFact);
  const used = new Set([normalizeStudyText(correct)]);
  const distractorFacts = [];
  const sameTerm = normalizeStudyText(usableTerm(correctFact));
  const sameTermFacts = pool.filter(
    (fact) => fact.id !== correctFact.id && normalizeStudyText(usableTerm(fact)) === sameTerm && sameTerm,
  );
  const sameSectionFacts = pool.filter(
    (fact) =>
      fact.id !== correctFact.id &&
      fact.heading &&
      fact.heading === correctFact.heading &&
      normalizeStudyText(usableTerm(fact)) !== sameTerm,
  );
  const otherFacts = pool.filter(
    (fact) => fact.id !== correctFact.id && fact.heading !== correctFact.heading,
  );
  const ordered = preferRelated
    ? [...sameTermFacts, ...sameSectionFacts, ...otherFacts]
    : [...otherFacts, ...sameSectionFacts, ...sameTermFacts];

  const take = (allowBlocked) => {
    for (const fact of ordered) {
      const text = answerTextForFact(fact);
      const key = normalizeStudyText(text);
      if (!key || used.has(key)) continue;
      if (!allowBlocked && blocked.has(key)) continue;
      distractorFacts.push(fact);
      used.add(key);
      if (distractorFacts.length === 3) break;
    }
  };
  take(false);
  if (distractorFacts.length < 3) take(true);

  if (distractorFacts.length < 3) return null;
  const distractors = distractorFacts.map((fact) => answerTextForFact(fact));

  const options = shuffle([correct, ...distractors], random);
  const correctIndex = options.findIndex((option) => option === correct);
  return {
    options,
    correctAnswer: LETTERS[correctIndex],
    correctIndex,
    explanation: correctFact.sentence,
    sourceTopic: (correctFact.heading || correctFact.term || "").slice(0, 200),
    distractorFacts,
  };
};

/**
 * A question is kept only when what it shows comes from this document.
 * "definition" (the default): the explanation and every option are facts of the note.
 * "cloze" / "statement": see sentenceQuestionIsGrounded.
 * "list" / "list-not" / "list-group": see listQuestionIsGrounded (needs the raw `sources`;
 * facts lose list structure).
 */
export const questionIsGrounded = (question, facts, { sources = [] } = {}) => {
  if (question?.kind === "cloze" || question?.kind === "statement") {
    return sentenceQuestionIsGrounded(question, facts);
  }
  if (["list", "list-not", "list-group"].includes(question?.kind)) {
    return listQuestionIsGrounded(question, sources);
  }
  if (question?.kind === "reasoning") return reasoningQuestionIsGrounded(question, sources);
  if (!question?.question || question.options?.length !== 4) return false;
  const explanationKey = normalizeStudyText(question.explanation);
  const source = facts.find((fact) => normalizeStudyText(fact.sentence) === explanationKey);
  if (!source) return false;

  const correct = question.options[question.correctIndex];
  if (normalizeStudyText(correct) !== normalizeStudyText(answerTextForFact(source))) return false;

  const allowed = new Set(facts.map((fact) => normalizeStudyText(answerTextForFact(fact))));
  return question.options.every((option) => allowed.has(normalizeStudyText(option)));
};

const stemFor = (fact, difficulty, rewritten, label) => {
  const proposed = rewritten.get(fact.id);
  if (proposed && stemFits(proposed, fact, label)) return proposed;
  return templateQuestion(fact, difficulty, label);
};

/** How hard each code-built kind is to answer, whatever level the user asked for. */
const KIND_LEVEL = {
  list: "easy",
  "list-not": "medium",
  cloze: "medium",
  statement: "hard",
  "list-group": "hard",
  reasoning: "hard",
};
const LEVELS = ["easy", "medium", "hard"];
// Where to look when the asked level runs out: nearest level first.
const LEVEL_FALLBACK = {
  easy: ["easy", "medium", "hard"],
  medium: ["medium", "easy", "hard"],
  hard: ["hard", "medium", "easy"],
};

/**
 * Pick questions by their real level. A single level takes that level first and tops up from
 * the nearest ones; "mixed" alternates easy, medium, hard. Kinds stay mixed inside a level,
 * a note sentence is asked about once, and earlier stems in `avoid` are skipped.
 */
const pickByDifficulty = (lists, mode, limit, avoid) => {
  const byLevel = Object.fromEntries(
    LEVELS.map((level) => [
      level,
      mixQuestionKinds(
        lists.map((list) => list.filter((question) => question.difficulty === level)),
        Infinity,
        avoid,
      ),
    ]),
  );
  const picked = [];
  const usedSources = new Set();
  const takeFrom = (level) => {
    const queue = byLevel[level];
    while (queue.length) {
      const question = queue.shift();
      const source = question.sourceKey ?? normalizeStudyText(question.explanation);
      if (usedSources.has(source)) continue;
      usedSources.add(source);
      picked.push(question);
      return true;
    }
    return false;
  };

  if (mode === "mixed") {
    while (picked.length < limit && LEVELS.some((level) => byLevel[level].length)) {
      for (const level of LEVELS) {
        if (picked.length >= limit) break;
        takeFrom(level);
      }
    }
  } else {
    for (const level of LEVEL_FALLBACK[mode]) {
      while (picked.length < limit && takeFrom(level));
    }
  }
  return picked;
};

/**
 * Take questions round-robin across kinds (definition, cloze, statement) so one quiz mixes them.
 * A note sentence is asked about once, and previously asked stems are skipped.
 */
const mixQuestionKinds = (lists, limit, avoid) => {
  const picked = [];
  const usedSources = new Set();
  const queues = lists.map((list) => [...list]);
  while (picked.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      if (picked.length >= limit) break;
      while (queue.length) {
        const question = queue.shift();
        const source = question.sourceKey ?? normalizeStudyText(question.explanation);
        if (usedSources.has(source) || avoid.has(normalizeStudyText(question.question))) continue;
        usedSources.add(source);
        picked.push(question);
        break;
      }
    }
  }
  return picked;
};

/**
 * One quiz pipeline: facts in, grounded options only. Three kinds of question:
 *   definition  "X là gì?" (wording tries Ollama, then OpenAI, then a template)
 *   cloze / statement  built from note sentences in code, no model call (sentence-items.js)
 *   list  "which item is listed under X" from heading + bullet blocks in `sources` (list-items.js)
 *   reasoning  "why / what if / how do A and B differ", written by Ollama (OpenAI fallback) from a
 *              note paragraph and checked against a quoted evidence sentence (reasoning-items.js)
 * `sources` are the raw note texts; slides with only titles and bullets need them.
 * Each question carries its real level (list easy; list-not, cloze medium; statement, list-group,
 * reasoning hard; definition from its distractors). `difficulty` easy | medium | hard takes that level first and
 * tops up from the nearest; "mixed" alternates the three (see pickByDifficulty).
 * `rewriteQuestions` and `generateReasoning` are injectable so tests do not call a model.
 */
export const buildQuizFromFacts = async (
  facts,
  {
    numberOfQuestions = 5,
    difficulty = "mixed",
    title = "Quiz",
    avoidQuestions = [],
    sources = [],
  } = {},
  {
    rewriteQuestions = rewriteQuestionsWithOllama,
    generateReasoning = buildReasoningQuestions,
    random = Math.random,
    onProgress = () => {},
  } = {},
) => {
  const mode = LEVELS.includes(difficulty) ? difficulty : "mixed";
  const counts = termCounts(facts);
  const labeled = facts.filter(
    (fact) => labelForFact(fact, counts) && substantiveAnswer(fact),
  );
  const sentenceQuestions = buildSentenceQuestions(facts, { random });
  const listQuestions = buildListQuestions(sources, { random });
  // Definition questions need four labeled facts (one answer, three distractors). The old
  // fallback used unlabeled lines and asked "which line is from your notes?" with four lines
  // that all were: no wrong answer. Too few facts now means fewer questions, never that.
  const pool = shuffle(labeled, random);
  const count = labeled.length >= 4 ? Math.min(numberOfQuestions, pool.length) : 0;
  const avoid = new Set(avoidQuestions.map((item) => normalizeStudyText(item)));
  const targets = pool.filter((fact) => {
    const label = labelForFact(fact, counts);
    const easyStem = normalizeStudyText(templateQuestion(fact, "easy", label));
    return !avoid.has(easyStem);
  }).slice(0, count);

  const buildDefinitions = (rewritten) => {
    const definitions = [];
    const usedDistractors = new Set();
    for (const fact of targets) {
      const label = labelForFact(fact, counts);
      const built = buildOptions(fact, pool, random, usedDistractors, mode !== "easy");
      if (!built) continue;
      // The real level from the distractors picked, not the level the user asked for.
      const level = difficultyFromDistractors("mixed", fact, built.distractorFacts);
      for (const distractor of built.distractorFacts) {
        usedDistractors.add(normalizeStudyText(answerTextForFact(distractor)));
      }
      const { distractorFacts, ...stored } = built;
      const proposed = rewritten.get(fact.id);
      const question = {
        kind: "definition",
        question: stemFor(fact, level, rewritten, label),
        difficulty: level,
        ...stored,
      };
      question.modelWorded = Boolean(proposed && question.question === proposed);
      if (questionIsGrounded(question, facts)) definitions.push(question);
    }
    return definitions;
  };
  const grounded = (list) =>
    list
      .filter((question) => questionIsGrounded(question, facts, { sources }))
      .map((question) => ({ ...question, difficulty: KIND_LEVEL[question.kind] }));

  // "Why / what if" questions are hard and cost a model call each (~15-30 s on a CPU-only
  // machine). Easy never asks for them; medium only when its own and easy questions run short,
  // since it would not reach the hard ones otherwise; hard and mixed always try.
  const notHardCount = () => {
    const askedLines = new Set();
    for (const question of [
      ...buildDefinitions(new Map()),
      ...grounded([...sentenceQuestions.cloze, ...listQuestions]),
    ]) {
      if (question.difficulty === "hard" || avoid.has(normalizeStudyText(question.question))) continue;
      askedLines.add(question.sourceKey ?? normalizeStudyText(question.explanation));
    }
    return askedLines.size;
  };
  // Progress: how many questions code already has (one per note line), before any model call.
  const preparedCount = () => {
    const lines = new Set(targets.map((fact) => normalizeStudyText(fact.sentence)));
    for (const question of grounded([
      ...sentenceQuestions.cloze,
      ...sentenceQuestions.statement,
      ...listQuestions,
    ])) {
      if (avoid.has(normalizeStudyText(question.question))) continue;
      lines.add(question.sourceKey ?? normalizeStudyText(question.explanation));
    }
    return Math.min(numberOfQuestions, lines.size);
  };

  const wantsReasoning =
    mode === "hard" || mode === "mixed" || (mode === "medium" && notHardCount() < numberOfQuestions);
  const reasoningLimit = wantsReasoning ? Math.min(2, Math.ceil(numberOfQuestions / 3)) : 0;
  // "ready" counts the questions the quiz has so far. Slots left for the model are not ready yet,
  // so the count keeps rising while it writes them (3/5, then 4/5…) instead of starting full.
  const codeReady = Math.min(preparedCount(), numberOfQuestions - reasoningLimit);
  const progress = { ready: codeReady, total: numberOfQuestions };
  onProgress({ stage: "prepared", ...progress });

  const reasoning = wantsReasoning
    ? await generateReasoning({
        sources,
        facts,
        limit: reasoningLimit,
        difficulty: KIND_LEVEL.reasoning,
        onAttempt: ({ made, limit }) =>
          onProgress({
            stage: "ai",
            current: made + 1,
            limit,
            ready: codeReady + made,
            total: numberOfQuestions,
          }),
      })
    : [];

  let rewritten = new Map();
  try {
    // Rewording only polishes "X là gì?" stems; skip that extra model call when one already ran.
    if (targets.length && !reasoning.length) {
      onProgress({ stage: "wording", ...progress });
      rewritten = await rewriteQuestions(
        targets.map((fact, index) => ({
          fact,
          label: labelForFact(fact, counts),
          difficulty: levelAt(index, targets.length, difficulty),
        })),
      );
    }
  } catch (error) {
    console.warn("Study quiz wording fell back to templates:", error.message);
  }

  const definitions = buildDefinitions(rewritten);
  const mixed = pickByDifficulty(
    [
      grounded(reasoning),
      definitions,
      grounded(sentenceQuestions.cloze),
      grounded(sentenceQuestions.statement),
      grounded(listQuestions),
    ],
    mode,
    numberOfQuestions,
    avoid,
  );
  const usedModelWording = mixed.some((question) => question.modelWorded);
  const modelWritten = mixed.find((question) => question.kind === "reasoning");
  // Drop fields only used while building (listItem: the item a "list-group" question asks about).
  const questions = mixed.map(
    ({ modelWorded, sourceKey, provider, model, listItem, ...question }) => question,
  );

  let model = "study-facts";
  if (modelWritten) model = `${modelWritten.provider}:${modelWritten.model}`;
  else if (usedModelWording) {
    model = `${rewritten.wordingProvider || "ollama"}:${rewritten.wordingModel || ollamaModelName()}`;
  }

  const baseTitle = String(title || "Quiz").trim().slice(0, 180);
  const quizTitle = /quiz/i.test(baseTitle) ? baseTitle : `${baseTitle} quiz`;

  return {
    title: quizTitle.slice(0, 200),
    description: "Each question is checked against a fact in your own notes.",
    questions,
    model,
  };
};

async function rewriteCardFrontsWithOllama(facts) {
  const counts = termCounts(facts);
  const targets = facts.map((fact) => ({ fact, label: labelForFact(fact, counts) }));
  const system = `Bạn viết mặt trước flashcard từ ghi chú của sinh viên.
Mỗi dòng là một fact. Viết một câu hỏi ngắn, theo đúng thứ tự, cùng ngôn ngữ với fact.
Câu hỏi phải nhắc đúng nhãn và không chứa định nghĩa.
Trả về JSON dạng {"questions":["câu 1","câu 2"]}.`;

  return rewriteWithModels(targets, {
    system,
    user: targets
      .map((item) => `Nhãn: ${item.label || item.fact.term || item.fact.id}`)
      .join("\n\n"),
    numPredict: Math.min(1600, 160 + facts.length * 80),
  });
}

const templateFront = (fact, label) => {
  if (label && isVietnamese(fact)) {
    const parts = label.split(" — ");
    if (parts.length === 2) return `${parts[0]} của ${parts[1]} là gì?`;
    return `${label} là gì?`;
  }
  if (fact.term) return `What is ${fact.term}?`;
  if (isVietnamese(fact)) return "Ghi chú nói gì về ý này?";
  return "What does this part of your notes say?";
};

export const cardIsGrounded = (card, fact) => {
  const back = normalizeStudyText(card?.back);
  const expected = normalizeStudyText(answerTextForFact(fact));
  return (
    Boolean(card?.front) &&
    expected.length > 0 &&
    back === expected &&
    normalizeStudyText(card.front) !== back
  );
};

/** Card back for a reasoning question: the answer plus the note sentence that backs it. */
const reasoningBack = (question) => {
  const answer = question.options[question.correctIndex];
  const vietnamese = /[ăâêôơưđáàảãạắằấầéèẹẻẽíìịỉĩóòọỏõúùụủũýỳỵỷỹ]/i.test(question.question);
  return `${answer} (${vietnamese ? "Ghi chú" : "Notes"}: "${question.explanation}")`;
};

/** Round-robin across card kinds so one deck mixes them; a front is used once. */
const mixCardKinds = (lists, limit) => {
  const cards = [];
  const seenFronts = new Set();
  const queues = lists.map((list) => [...list]);
  while (cards.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      if (cards.length >= limit) break;
      while (queue.length) {
        const card = queue.shift();
        const key = normalizeStudyText(card.front);
        if (seenFronts.has(key)) continue;
        seenFronts.add(key);
        cards.push(card);
        break;
      }
    }
  }
  return cards;
};

/**
 * Same pipeline as the quiz, as front/back cards:
 *   reasoning   "Vì sao…?" / "Điều gì xảy ra nếu…?" from Ollama (OpenAI fallback), checked against
 *               a quoted note sentence; back = answer + that quote (reasoning-items.js)
 *   definition  "X là gì?" / definition (front wording tries Ollama, then a template)
 *   cloze       "___ cho phép…" / term (sentence-items.js)
 *   list        "What is listed under X?" / the items (list-items.js)
 * Kinds are mixed round-robin. `rewriteFronts` and `generateReasoning` are injectable for tests.
 * Returns { cards, model }: `model` names what wrote the deck, like a quiz's aiModel
 * ("ollama:qwen2.5:3b", "openai:gpt-4.1-mini", or "study-facts" when no model was used).
 */
export const buildFlashcardDeck = async (
  facts,
  { numberOfCards = 5, sources = [] } = {},
  {
    rewriteFronts = rewriteCardFrontsWithOllama,
    generateReasoning = buildReasoningQuestions,
    random = Math.random,
    onProgress = () => {},
  } = {},
) => {
  const counts = termCounts(facts);
  // Same bar as quiz definitions: a title line like "Java — Practice Problems" is not a card.
  const labeled = facts
    .filter((fact) => labelForFact(fact, counts) && substantiveAnswer(fact))
    .slice(0, numberOfCards);
  const clozeCards = buildClozeCards(facts, { random });
  const listCards = buildListCards(sources);
  // At most a couple per deck: each one is a model call (~15-30 s on a CPU-only machine).
  const reasoningLimit = Math.min(2, Math.ceil(numberOfCards / 3));
  // "ready" counts cards the deck has so far; slots left for the model fill in as it writes them.
  const codeReady = Math.min(
    labeled.length + clozeCards.length + listCards.length,
    numberOfCards - reasoningLimit,
  );
  const progress = { ready: codeReady, total: numberOfCards };
  onProgress({ stage: "prepared", ...progress });

  const reasoning = await generateReasoning({
    sources,
    facts,
    limit: reasoningLimit,
    onAttempt: ({ made, limit }) =>
      onProgress({ stage: "ai", current: made + 1, limit, ready: codeReady + made, total: numberOfCards }),
  });
  const reasoningCards = reasoning
    .filter((question) => reasoningQuestionIsGrounded(question, sources))
    .map((question) => ({
      front: question.question,
      back: reasoningBack(question),
      via: `${question.provider}:${question.model}`,
    }));

  const hasOtherCards = reasoningCards.length || clozeCards.length || listCards.length;
  // Unlabeled lines only become cards ("what does this part say?") when nothing better exists.
  const chosen = labeled.length || hasOtherCards ? labeled : facts.slice(0, numberOfCards);

  let fronts = new Map();
  try {
    // Rewording only polishes "X là gì?" fronts; skip that extra model call when one already ran.
    if (chosen.length && !reasoningCards.length) {
      onProgress({ stage: "wording", ...progress });
      fronts = await rewriteFronts(chosen);
    }
  } catch (error) {
    console.warn("Study flashcard wording fell back to templates:", error.message);
  }

  const definitionCards = [];
  for (const fact of chosen) {
    const back = answerTextForFact(fact);
    const label = labelForFact(fact, counts);
    const proposed = fronts.get(fact.id);
    let front = proposed || templateFront(fact, label);
    if (!stemFits(front, fact, label)) {
      front = templateFront(fact, label);
    }
    const card = { front, back };
    if (proposed && front === proposed) {
      card.via = `${fronts.wordingProvider || "ollama"}:${fronts.wordingModel || ollamaModelName()}`;
    }
    if (cardIsGrounded(card, fact)) definitionCards.push(card);
  }

  const mixed = mixCardKinds([reasoningCards, definitionCards, clozeCards, listCards], numberOfCards);
  // A model-written card that made it into the deck names the deck's model.
  const model = mixed.find((card) => card.via)?.via ?? "study-facts";
  return { cards: mixed.map(({ via, ...card }) => card), model };
};

/** Just the cards (see buildFlashcardDeck). */
export const buildFlashcardsFromFacts = async (...args) => (await buildFlashcardDeck(...args)).cards;
