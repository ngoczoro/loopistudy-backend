import { GoogleGenerativeAI } from "@google/generative-ai";
import ApiError from "../../../utils/ApiError.js";
import { CHAT_INTENT_TYPES, getGeminiConfig } from "./ai-plan.constants.js";
import { SUBJECT_DIFFICULTY } from "../../../config/constants.js";

const VALID_DIFFICULTIES = [
  SUBJECT_DIFFICULTY.EASY,
  SUBJECT_DIFFICULTY.MEDIUM,
  SUBJECT_DIFFICULTY.HARD,
];

const getModel = () => {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    throw ApiError.internalServer(
      "GEMINI_API_KEY is not configured. Add it to your .env file.",
    );
  }

  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });
};

const parseJsonResponse = (text) => {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
};

const validateAnalyzeResult = (raw, fallbackTitle) => ({
  suggestedName: String(raw.suggestedName || fallbackTitle || "Document"),
  examDate: raw.examDate ? String(raw.examDate).slice(0, 10) : null,
  difficulty: VALID_DIFFICULTIES.includes(raw.difficulty)
    ? raw.difficulty
    : SUBJECT_DIFFICULTY.MEDIUM,
  hoursPerWeek: Math.min(
    168,
    Math.max(1, Number(raw.hoursPerWeek) || 4),
  ),
  topics: Array.isArray(raw.topics)
    ? raw.topics.map(String).slice(0, 12)
    : [],
  rationale: String(raw.rationale || "Gemini analyzed the syllabus content."),
});

const validateChatResult = (raw) => {
  const intents = Array.isArray(raw.intents)
    ? raw.intents.filter((intent) =>
        CHAT_INTENT_TYPES.includes(intent?.type),
      )
    : [];

  return {
    reply: String(raw.reply || "Plan updated."),
    needsClarification: Boolean(raw.needsClarification),
    clarificationQuestion: raw.clarificationQuestion
      ? String(raw.clarificationQuestion)
      : null,
    intents,
  };
};

export const analyzeDocumentWithGemini = async (text, { title = "Document" } = {}) => {
  const model = getModel();
  const truncated = text.slice(0, 32000);

  const prompt = `You analyze university course syllabi for a study planner app.
Read the document text and return ONLY valid JSON with this shape:
{
  "suggestedName": "string",
  "examDate": "YYYY-MM-DD or null",
  "difficulty": "Easy" | "Medium" | "Hard",
  "hoursPerWeek": number,
  "topics": ["string"],
  "rationale": "short explanation in English or Vietnamese"
}

Rules:
- examDate: extract final exam/end date if present, else null
- hoursPerWeek: realistic weekly study hours (3-12)
- difficulty: based on workload and content depth
- topics: main chapters/units (max 12)

Document title: ${title}

Document text:
${truncated}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  return validateAnalyzeResult(parseJsonResponse(responseText), title);
};

export const parseChatWithGemini = async (
  message,
  { subjects = [], constraints = [], planContext = {} } = {},
) => {
  const model = getModel();

  const subjectSummary = subjects.map((subject) => ({
    name: subject.name,
    difficulty: subject.difficulty,
    priority: subject.priority,
    hoursPerWeek: subject.requiredHoursPerWeek ?? subject.credits,
    examDate: subject.examDate,
  }));

  const prompt = `You help adjust a student study plan via chat.
Return ONLY valid JSON:
{
  "reply": "friendly short reply to the user",
  "needsClarification": boolean,
  "clarificationQuestion": "string or null",
  "intents": [
    {
      "type": "SET_HOURS_PER_WEEK | SET_PRIORITY | ...",
      "subjectName": "optional",
      "value": "optional number or string",
      "dayOfWeek": "optional 0-6 Mon=0",
      "hour": "optional number",
      "weekStartDate": "optional YYYY-MM-DD",
      "priority": "optional low|medium|high"
    }
  ]
}

Allowed intent types: ${CHAT_INTENT_TYPES.join(", ")}

Intent guide:
- SET_HOURS_PER_WEEK: value = hours per week
- SET_PRIORITY: priority = low|medium|high
- MOVE_SUBJECT_TO_DAY: subjectName + dayOfWeek (0=Mon..6=Sun)
- NO_STUDY_AFTER: hour = latest start/end boundary (e.g. 20)
- REDUCE_DIFFICULTY: subjectName (reduce one level)
- REGENERATE_SUBJECT: subjectName
- BLOCK_DAY: dayOfWeek, optional weekStartDate

If the request is unclear, set needsClarification true and ask in clarificationQuestion.
Do NOT invent intents outside the whitelist.

Current subjects:
${JSON.stringify(subjectSummary)}

Active constraints:
${JSON.stringify(constraints)}

Plan summary:
${JSON.stringify(planContext?.weeklySummary ?? [])}

User message:
${message}`;

  const result = await model.generateContent(prompt);
  return validateChatResult(parseJsonResponse(result.response.text()));
};
