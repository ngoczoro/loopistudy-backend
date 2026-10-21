export const FLASHCARD_PROMPT_VERSION = "1.0.0";

const formatAvoidFronts = (fronts = []) => {
  if (!fronts.length) {
    return "Không có thẻ trước đó cần tránh.";
  }

  return fronts.map((front, index) => `${index + 1}. ${front}`).join("\n");
};

const formatSummaryContext = (summaryContext) => {
  if (!summaryContext?.summary) {
    return "";
  }

  const parts = [
    "TÓM TẮT AI CỦA GHI CHÚ (chỉ dùng khi khớp với nội dung gốc):",
    summaryContext.summary,
  ];

  if (Array.isArray(summaryContext.keyPoints) && summaryContext.keyPoints.length) {
    parts.push(`Điểm chính: ${summaryContext.keyPoints.join("; ")}`);
  }

  return parts.join("\n");
};

export const buildDocumentFlashcardPrompt = ({
  documentTitle = "",
  documentText = "",
  summaryContext = null,
  subjectName = "",
  numberOfCards = 5,
  avoidFronts = [],
} = {}) => {
  const instructions = `You create study flashcards from one student note.

Use only the note and its AI summary. Never use outside knowledge.
If the note does not contain enough facts, return fewer cards instead of inventing them.
Write every card in the same language as the note.

Each card has:
- front: a short prompt, question, or term (one idea)
- back: the answer or definition a student should recall

Rules:
- Create up to ${numberOfCards} cards. Prefer exactly ${numberOfCards} when the note supports that many distinct facts.
- Do not repeat a fact.
- Do not copy the whole note onto one card.
- Skip greetings, headings with no fact, and duplicate lines.

Avoid cards whose front matches or closely paraphrases:
${formatAvoidFronts(avoidFronts)}

OUTPUT:
- Return ONLY valid JSON. No markdown.
- front max 500 characters. back max 2000 characters.

JSON shape:
{
  "cards": [
    { "front": "string", "back": "string" }
  ]
}`;

  const contextLines = [
    documentTitle ? `Tiêu đề ghi chú: ${documentTitle}` : null,
    subjectName ? `Môn học: ${subjectName}` : null,
    `Số thẻ mong muốn: ${numberOfCards}`,
  ].filter(Boolean);

  const inputParts = [
    contextLines.join("\n"),
    formatSummaryContext(summaryContext),
    documentText ? `Nội dung ghi chú:\n${documentText}` : null,
  ].filter(Boolean);

  return {
    feature: "flashcards-note",
    version: FLASHCARD_PROMPT_VERSION,
    instructions,
    input: inputParts.join("\n\n"),
  };
};
