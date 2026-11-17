/**
 * Questions that need understanding ("why", "what happens if", "how do A and B differ"), written
 * by a model from one note paragraph and then checked in code:
 *   - code picks the paragraph and the question type from cue words (vì, nếu, khác…)
 *   - Ollama writes one question with a quoted `evidence` sentence (OpenAI if Ollama fails)
 *   - the evidence must appear in the paragraph and support the right option better than
 *     the wrong ones; anything else is dropped
 * Kept to a couple per quiz: on a CPU-only machine each call takes ~15-30 s.
 */
import { getOpenAIConfig } from "../ai/ai.constants.js";
import { generateJson } from "../ai/services/ai.provider.service.js";
import { completeJson, ollamaModelName } from "./ollama.js";

const LETTERS = ["A", "B", "C", "D"];
const UNIT_MIN_CHARS = 120;
const UNIT_MAX_CHARS = 900;
const CALL_TIMEOUT_MS = Number(process.env.STUDY_REASONING_TIMEOUT_MS || 45_000);
const TOTAL_BUDGET_MS = Number(process.env.STUDY_REASONING_BUDGET_MS || 75_000);
export const reasoningEnabled = () => process.env.STUDY_REASONING_ENABLED !== "false";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const fold = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
// For evidence lookups: case, spacing and surrounding quotes/punctuation do not matter.
const matchKey = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/^["'“”‘’«»\s]+|["'“”‘’«»\s.…]+$/g, "");

/* ---------- Paragraph units ---------- */

const isMarkerLine = (line) => /^slide\s+\d+\s*:?$/i.test(line) || /^#\s/.test(line);

/** Cut to the last sentence end before the limit so the model gets whole sentences. */
const trimToSentences = (text) => {
  if (text.length <= UNIT_MAX_CHARS) return text;
  const cut = text.slice(0, UNIT_MAX_CHARS);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > UNIT_MIN_CHARS ? cut.slice(0, end + 1) : cut;
};

/** Prose paragraphs from the raw notes, most useful first (those holding the quiz's facts). */
export const paragraphUnits = (sources = [], facts = []) => {
  const factKeys = facts.map((fact) => matchKey(fact.sentence)).filter((key) => key.length >= 20);
  const units = [];
  const seen = new Set();
  for (const source of sources) {
    for (const block of String(source).replace(/\r/g, "").split(/\n\s*\n/)) {
      const text = trimToSentences(
        clean(
          block
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !isMarkerLine(line))
            .join(" "),
        ),
      );
      const key = matchKey(text);
      if (text.length < UNIT_MIN_CHARS || text.split(" ").length < 15 || seen.has(key)) continue;
      seen.add(key);
      const hits = factKeys.filter((factKey) => key.includes(factKey)).length;
      units.push({ text, hits, order: units.length });
    }
  }
  return units.sort((a, b) => b.hits - a.hits || a.order - b.order).map(({ text }) => text);
};

/* ---------- Question type from cue words ---------- */

// "khác nhau" is left out on purpose: in notes it nearly always means "various" ("nhiều cách
// khác nhau"), and forcing a comparison there made the model invent the second side.
const CUES = [
  ["compare", /\b(khac voi|giong nhu|giong voi|trong khi|so voi|nguoc lai|tuong tu nhu|whereas|unlike|compared to|compared with|similar to|differs? from)\b/],
  ["condition", /\b(neu|truong hop|if|unless|otherwise)\b/],
  ["why", /\b(vi(?! du)|boi vi|nen|nho do|nho vao|giup|do do|because|therefore|thus|so that|in order to|helps?|allows?)\b/],
];

/** "compare" | "condition" | "why" | null, from what the paragraph actually says. */
export const reasoningTypeFor = (text) => {
  const folded = fold(text);
  return CUES.find(([, pattern]) => pattern.test(folded))?.[0] ?? null;
};

/* ---------- Prompt ---------- */

const SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
    evidence: { type: "string" },
  },
  required: ["question", "options", "correctIndex", "evidence"],
};

const SYSTEM = [
  "Bạn soạn câu hỏi trắc nghiệm ôn tập từ một đoạn ghi chú của sinh viên.",
  "Chỉ dùng thông tin có trong đoạn, không thêm kiến thức bên ngoài.",
  "Viết bằng cùng ngôn ngữ với đoạn ghi chú.",
  "Có đúng 4 lựa chọn: 1 đúng theo đoạn, 3 sai nhưng nghe hợp lý.",
  "evidence là MỘT câu chép nguyên văn từ đoạn, chứng minh đáp án đúng.",
  "Chỉ trả về JSON.",
].join(" ");

const EXAMPLES = {
  why: {
    instruction: 'Hỏi "Vì sao…?" về nguyên nhân hoặc lợi ích mà đoạn nêu.',
    passage:
      "Đóng gói che giấu dữ liệu bên trong đối tượng. Nhờ đó dữ liệu không bị thay đổi ngoài ý muốn.",
    answer: {
      question: "Vì sao đóng gói giúp dữ liệu không bị thay đổi ngoài ý muốn?",
      options: [
        "Vì dữ liệu được che giấu bên trong đối tượng",
        "Vì dữ liệu được sao chép sang nhiều lớp",
        "Vì mọi lớp đều sửa trực tiếp dữ liệu",
        "Vì dữ liệu chỉ được lưu tạm thời",
      ],
      correctIndex: 0,
      evidence: "Đóng gói che giấu dữ liệu bên trong đối tượng.",
    },
  },
  condition: {
    instruction: 'Hỏi "Điều gì xảy ra nếu…?" về điều kiện và kết quả mà đoạn nêu.',
    passage:
      "Nếu mất kết nối Internet, người dùng không truy cập được dữ liệu trên đám mây. Vì vậy kết nối ổn định rất quan trọng.",
    answer: {
      question: "Điều gì xảy ra nếu mất kết nối Internet?",
      options: [
        "Người dùng không truy cập được dữ liệu trên đám mây",
        "Dữ liệu tự động chuyển về máy tính cá nhân",
        "Chi phí sử dụng dịch vụ giảm xuống",
        "Dữ liệu được sao lưu nhanh hơn",
      ],
      correctIndex: 0,
      evidence: "Nếu mất kết nối Internet, người dùng không truy cập được dữ liệu trên đám mây.",
    },
  },
  compare: {
    instruction: "Hỏi A và B khác (hoặc giống) nhau thế nào, theo đúng điều đoạn so sánh.",
    passage:
      "Trong khi IaaS cung cấp hạ tầng như máy chủ và lưu trữ, PaaS cung cấp nền tảng để lập trình viên xây dựng ứng dụng.",
    answer: {
      question: "IaaS khác PaaS ở điểm nào?",
      options: [
        "IaaS cung cấp hạ tầng, còn PaaS cung cấp nền tảng để xây dựng ứng dụng",
        "IaaS cung cấp phần mềm hoàn chỉnh, còn PaaS chỉ cung cấp lưu trữ",
        "IaaS và PaaS đều chỉ cung cấp máy chủ",
        "PaaS cung cấp hạ tầng, còn IaaS cung cấp nền tảng lập trình",
      ],
      correctIndex: 0,
      evidence:
        "Trong khi IaaS cung cấp hạ tầng như máy chủ và lưu trữ, PaaS cung cấp nền tảng để lập trình viên xây dựng ứng dụng.",
    },
  },
};

export const buildReasoningPrompt = (type, passage) => {
  const example = EXAMPLES[type];
  return [
    example.instruction,
    "",
    "Ví dụ:",
    `Đoạn: ${example.passage}`,
    `JSON: ${JSON.stringify(example.answer)}`,
    "",
    `Đoạn: ${passage}`,
    "JSON:",
  ].join("\n");
};

/* ---------- Checking a model answer ---------- */

const STOPWORDS = new Set(
  "va la cua cac mot nhung cho voi trong duoc khi thi co khong nay do vi nen cung the and of to a an the is are in on for by with that this it as be".split(
    " ",
  ),
);
const tokens = (text) => new Set(fold(text).split(/[^a-z0-9]+/).filter((word) => word.length >= 2 && !STOPWORDS.has(word)));
const overlap = (option, evidence) => {
  const words = tokens(option);
  if (!words.size) return 0;
  const evidenceWords = tokens(evidence);
  return [...words].filter((word) => evidenceWords.has(word)).length / words.size;
};

// "không", "chỉ"… are stopwords, so "lớp con KHÔNG THỂ thay đổi…" would look like the evidence.
const NEGATION = /\b(khong|chang|chua|chi|not|never|no|only|cannot)\b/;
/** Word overlap with the evidence, halved when the option negates or limits what it says. */
const support = (option, evidence) => {
  const score = overlap(option, evidence);
  return NEGATION.test(fold(option)) && !NEGATION.test(fold(evidence)) ? score / 2 : score;
};

// Share of the quote's words found in one paragraph sentence; quotes are often partial.
const EVIDENCE_MATCH = 0.9;
const MIN_EVIDENCE_WORDS = 5;
const passageSentences = (passage) =>
  clean(passage)
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter((sentence) => sentence.length >= 20);

/**
 * The paragraph's own wording for the model's quote: the quote itself when it is verbatim,
 * else the paragraph sentence holding (nearly) all of its words, since small models quote
 * part of a sentence or reword it a little. Null when no sentence backs it.
 */
export const quoteFromPassage = (evidence, passage) => {
  if (evidence.length < 20) return null;
  if (matchKey(passage).includes(matchKey(evidence))) return evidence;
  if (tokens(evidence).size < MIN_EVIDENCE_WORDS) return null;
  let best = null;
  let bestScore = 0;
  for (const sentence of passageSentences(passage)) {
    const score = overlap(evidence, sentence);
    if (score > bestScore) [best, bestScore] = [sentence, score];
  }
  return bestScore >= EVIDENCE_MATCH ? best : null;
};

/**
 * The model's question, or null when it cannot be trusted:
 * evidence not quoted from the paragraph, a right option the evidence does not support
 * (or supports no better than a wrong one), duplicate options, or the answer in the question.
 * A slightly reworded quote is replaced by the paragraph's own sentence.
 */
export const checkReasoningAnswer = (json, passage) => {
  const question = clean(json?.question);
  const options = Array.isArray(json?.options) ? json.options.map(clean) : [];
  const correctIndex = Number(json?.correctIndex);

  if (question.length < 10 || question.length > 300) return null;
  if (options.length !== 4 || options.some((option) => !option || option.length > 200)) return null;
  if (new Set(options.map((option) => option.toLowerCase())).size !== 4) return null;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;
  const evidence = quoteFromPassage(clean(json?.evidence), passage);
  if (!evidence) return null;

  const correct = options[correctIndex];
  if (question.toLowerCase().includes(correct.toLowerCase())) return null;
  const backing = support(correct, evidence);
  const bestWrong = Math.max(
    ...options.filter((_, index) => index !== correctIndex).map((option) => support(option, evidence)),
  );
  if (backing < 0.4 || backing <= bestWrong + 0.1) return null;

  return { question, options, correctIndex, evidence };
};

/* ---------- Calling the models ---------- */

/** Ollama first, OpenAI when Ollama fails or is too slow. Returns { json, provider, model }. */
const askModels = async (type, passage) => {
  const user = buildReasoningPrompt(type, passage);
  try {
    const { json, model } = await completeJson({
      system: SYSTEM,
      user,
      numPredict: 400,
      format: SCHEMA,
      timeoutMs: CALL_TIMEOUT_MS,
    });
    return { json, provider: "ollama", model };
  } catch (error) {
    if (!getOpenAIConfig().apiKey) throw error;
    console.warn("Reasoning question: Ollama failed, trying OpenAI:", error.message);
    const json = await generateJson({
      instructions: SYSTEM,
      input: user,
      temperature: 0.4,
      maxOutputTokens: 500,
    });
    return { json, provider: "openai", model: getOpenAIConfig().model };
  }
};

/**
 * Up to `limit` checked reasoning questions from the notes, within a time budget.
 * `ask(type, passage)` is injectable so tests do not call a model.
 */
export const buildReasoningQuestions = async ({
  sources = [],
  facts = [],
  limit = 2,
  difficulty = "hard",
  ask = askModels,
  now = Date.now,
} = {}) => {
  if (!reasoningEnabled() || limit <= 0) return [];
  const started = now();
  const questions = [];

  for (const passage of paragraphUnits(sources, facts)) {
    if (questions.length >= limit || now() - started > TOTAL_BUDGET_MS) break;
    const type = reasoningTypeFor(passage);
    if (!type) continue;
    try {
      const { json, provider, model } = await ask(type, passage);
      const checked = checkReasoningAnswer(json, passage);
      if (!checked) continue;
      questions.push({
        kind: "reasoning",
        reasoningType: type,
        question: checked.question,
        options: checked.options,
        correctIndex: checked.correctIndex,
        correctAnswer: LETTERS[checked.correctIndex],
        explanation: checked.evidence,
        sourceTopic: type,
        difficulty,
        sourceKey: `reasoning|${matchKey(checked.evidence)}`,
        provider,
        model: model ?? (provider === "ollama" ? ollamaModelName() : null),
      });
    } catch (error) {
      console.warn("Reasoning question skipped:", error.message);
    }
  }
  return questions;
};

/** A stored reasoning question: its evidence must still be a quote from the notes. */
export const reasoningQuestionIsGrounded = (question, sources = []) => {
  const key = matchKey(question?.explanation);
  if (!key || question.options?.length !== 4) return false;
  return sources.some((source) => matchKey(source).includes(key));
};
