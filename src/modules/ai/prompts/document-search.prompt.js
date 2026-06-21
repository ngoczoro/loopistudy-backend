export const DOCUMENT_SEARCH_EXPLAIN_PROMPT_VERSION = "1.1.0";

const NOT_ENOUGH_INFO_MESSAGE =
  "Tài liệu hiện có chưa đủ thông tin để trả lời câu hỏi này.";

export const buildDocumentSearchExplainPrompt = ({
  query = "",
  passages = [],
} = {}) => {
  const instructions = `You are answering a student's question using only the provided document passages.

Do not use outside knowledge.

If the passages do not contain enough information, set answer to exactly:
"${NOT_ENOUGH_INFO_MESSAGE}"

Return ONLY valid JSON with this shape:
{
  "answer": "string",
  "passageReasons": [
    {
      "documentId": "uuid",
      "reason": "string"
    }
  ]
}

Rules:
- answer must be in Vietnamese, concise, student-friendly.
- passageReasons must reference documentId values from the provided passages only.
- reason explains why that passage supports the answer (one short sentence each).
- Do not invent facts not present in the passages.`;

  const passageBlocks = passages
    .map(
      (item, index) =>
        `[Passage ${index + 1}]
documentId: ${item.documentId}
documentTitle: ${item.documentTitle}
subjectName: ${item.subjectName || "General"}
excerpt:
${item.excerpt}`,
    )
    .join("\n\n");

  const input = `Student question:
${query}

Matched passages:
${passageBlocks}`;

  return {
    feature: "document-search-explain",
    version: DOCUMENT_SEARCH_EXPLAIN_PROMPT_VERSION,
    instructions,
    input,
  };
};

/** @deprecated Use buildDocumentSearchExplainPrompt */
export const buildDocumentSearchPrompt = buildDocumentSearchExplainPrompt;

export { NOT_ENOUGH_INFO_MESSAGE };

