import { generateJson } from "../../ai/services/ai.provider.service.js";
import { MAX_AI_INPUT_CHARS } from "../../ai/ai.constants.js";
import { SUBJECT_DIFFICULTY } from "../../../config/constants.js";
import { CHAT_INTENT_TYPES } from "./ai-plan.constants.js";

const VALID_DIFFICULTIES = [
  SUBJECT_DIFFICULTY.EASY,
  SUBJECT_DIFFICULTY.MEDIUM,
  SUBJECT_DIFFICULTY.HARD,
];

const ANALYZE_INSTRUCTIONS = `You analyze university course syllabi for a study planner app.
Return JSON with this shape:
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
- topics: main chapters/units (max 12)`;

const CHAT_INSTRUCTIONS = `You help adjust a student study plan via chat.
Return JSON with this shape:
{
  "reply": "friendly short reply to the user",
  "needsClarification": boolean,
  "clarificationQuestion": "string or null",
  "intents": [
    {
      "type": "SET_HOURS_PER_WEEK | SET_PRIORITY | MOVE_SUBJECT_TO_DAY | NO_STUDY_AFTER | REDUCE_DIFFICULTY | REGENERATE_SUBJECT | BLOCK_DAY",
      "subjectName": "optional",
      "value": "optional number",
      "dayOfWeek": "optional 0-6 Mon=0",
      "hour": "optional number",
      "weekStartDate": "optional YYYY-MM-DD",
      "priority": "optional low|medium|high"
    }
  ]
}

Allowed intent types only: ${CHAT_INTENT_TYPES.join(", ")}

Intent guide:
- SET_HOURS_PER_WEEK: value = hours per week
- SET_PRIORITY: priority = low|medium|high
- MOVE_SUBJECT_TO_DAY: subjectName + dayOfWeek (0=Mon..6=Sun)
- NO_STUDY_AFTER: hour = latest study boundary (e.g. 20)
- REDUCE_DIFFICULTY: subjectName (reduce one level)
- REGENERATE_SUBJECT: subjectName
- BLOCK_DAY: dayOfWeek, optional weekStartDate

If the request is unclear or unrelated to study scheduling, set needsClarification true and ask in clarificationQuestion.
Do NOT invent intents outside the whitelist.
Never output concrete session times or a full weekly timetable — only intents.`;

export const validateAnalyzeResult = (raw, fallbackTitle) => ({
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
  rationale: String(raw.rationale || "AI analyzed the syllabus content."),
});

export const validateChatResult = (raw) => {
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

export const analyzeDocumentWithOpenAI = async (
  text,
  { title = "Document" } = {},
) => {
  const truncated = text.slice(0, MAX_AI_INPUT_CHARS);
  const input = `Document title: ${title}\n\nDocument text:\n${truncated}`;

  const raw = await generateJson({
    instructions: ANALYZE_INSTRUCTIONS,
    input,
    temperature: 0.2,
  });

  return validateAnalyzeResult(raw, title);
};

export const parseChatWithOpenAI = async (
  message,
  { subjects = [], constraints = [], planContext = {} } = {},
) => {
  const subjectSummary = subjects.map((subject) => ({
    name: subject.name,
    difficulty: subject.difficulty,
    priority: subject.priority,
    hoursPerWeek: subject.requiredHoursPerWeek ?? subject.credits,
    examDate: subject.examDate,
  }));

  const input = `Current subjects:
${JSON.stringify(subjectSummary)}

Active constraints:
${JSON.stringify(constraints)}

Plan summary:
${JSON.stringify(planContext?.weeklySummary ?? [])}

User message:
${message}`;

  const raw = await generateJson({
    instructions: CHAT_INSTRUCTIONS,
    input,
    temperature: 0.2,
  });

  return validateChatResult(raw);
};
