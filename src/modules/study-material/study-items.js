import { getOpenAIConfig } from "../ai/ai.constants.js";
import { generateJson } from "../ai/services/ai.provider.service.js";
import { completeJson, ollamaModelName } from "./ollama.js";

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

export const buildOptions = (correctFact, pool, random = Math.random, blocked = new Set()) => {
  const correct = answerTextForFact(correctFact);
  const used = new Set([normalizeStudyText(correct)]);
  const distractorFacts = [];
  const sameTerm = normalizeStudyText(usableTerm(correctFact));
  const ordered = [
    ...pool.filter(
      (fact) => fact.id !== correctFact.id && normalizeStudyText(usableTerm(fact)) === sameTerm && sameTerm,
    ),
    ...pool.filter(
      (fact) =>
        fact.id !== correctFact.id &&
        fact.heading &&
        fact.heading === correctFact.heading &&
        normalizeStudyText(usableTerm(fact)) !== sameTerm,
    ),
    ...pool.filter(
      (fact) => fact.id !== correctFact.id && fact.heading !== correctFact.heading,
    ),
  ];

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

/** A question is kept only when the explanation and every option are facts from this document. */
export const questionIsGrounded = (question, facts) => {
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

/**
 * One quiz pipeline: facts in, grounded options only.
 * Question wording tries Ollama, then OpenAI. `rewriteQuestions` is injectable so tests do not call either.
 */
export const buildQuizFromFacts = async (
  facts,
  { numberOfQuestions = 5, difficulty = "mixed", title = "Quiz", avoidQuestions = [] } = {},
  { rewriteQuestions = rewriteQuestionsWithOllama, random = Math.random } = {},
) => {
  const counts = termCounts(facts);
  const labeled = facts.filter(
    (fact) => labelForFact(fact, counts) && substantiveAnswer(fact),
  );
  const pool = shuffle(labeled.length >= 4 ? labeled : facts, random);
  const count = Math.min(numberOfQuestions, pool.length);
  const avoid = new Set(avoidQuestions.map((item) => normalizeStudyText(item)));
  const targets = pool.filter((fact) => {
    const label = labelForFact(fact, counts);
    const easyStem = normalizeStudyText(templateQuestion(fact, "easy", label));
    return !avoid.has(easyStem);
  }).slice(0, count);

  let rewritten = new Map();
  try {
    rewritten = await rewriteQuestions(
      targets.map((fact, index) => ({
        fact,
        label: labelForFact(fact, counts),
        difficulty: levelAt(index, targets.length, difficulty),
      })),
    );
  } catch (error) {
    console.warn("Study quiz wording fell back to templates:", error.message);
  }

  const questions = [];
  let usedModelWording = false;
  const usedDistractors = new Set();
  for (let index = 0; index < targets.length; index += 1) {
    const fact = targets[index];
    const label = labelForFact(fact, counts);
    const built = buildOptions(fact, pool, random, usedDistractors);
    if (!built) continue;
    const level = difficultyFromDistractors(difficulty, fact, built.distractorFacts);
    for (const distractor of built.distractorFacts) {
      usedDistractors.add(normalizeStudyText(answerTextForFact(distractor)));
    }
    const { distractorFacts, ...stored } = built;
    const proposed = rewritten.get(fact.id);
    const question = {
      question: stemFor(fact, level, rewritten, label),
      difficulty: level,
      ...stored,
    };
    if (proposed && question.question === proposed) usedModelWording = true;
    if (questionIsGrounded(question, facts)) questions.push(question);
  }

  const model = usedModelWording
    ? `${rewritten.wordingProvider || "ollama"}:${rewritten.wordingModel || ollamaModelName()}`
    : "study-facts";

  const baseTitle = String(title || "Quiz").trim().slice(0, 180);
  const quizTitle = /quiz/i.test(baseTitle) ? baseTitle : `${baseTitle} quiz`;

  return {
    title: quizTitle.slice(0, 200),
    description: "Each question is checked against a fact in your own notes.",
    questions: questions.slice(0, numberOfQuestions),
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

export const buildFlashcardsFromFacts = async (
  facts,
  { numberOfCards = 5 } = {},
  { rewriteFronts = rewriteCardFrontsWithOllama } = {},
) => {
  const counts = termCounts(facts);
  const selected = facts
    .filter((fact) => labelForFact(fact, counts) || facts.length < 4)
    .slice(0, numberOfCards);
  const chosen = selected.length ? selected : facts.slice(0, numberOfCards);
  let fronts = new Map();
  try {
    fronts = await rewriteFronts(chosen);
  } catch (error) {
    console.warn("Study flashcard wording fell back to templates:", error.message);
  }

  const cards = [];
  for (const fact of chosen) {
    const back = answerTextForFact(fact);
    const label = labelForFact(fact, counts);
    let front = fronts.get(fact.id) || templateFront(fact, label);
    if (!stemFits(front, fact, label)) {
      front = templateFront(fact, label);
    }
    const card = { front, back };
    if (cardIsGrounded(card, fact)) cards.push(card);
  }

  return cards;
};
