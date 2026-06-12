export const QA_PROMPT_VERSION = "0.1.0";

/** Placeholder builder for future AI Question Answering from course documents. */
export const buildQaPrompt = ({
  question = "",
  documentText = "",
  subjectName = "",
} = {}) => ({
  feature: "qa",
  version: QA_PROMPT_VERSION,
  instructions:
    "Placeholder system prompt for document-grounded Q&A. Implement in a future phase.",
  input: documentText,
  context: {
    question,
    subjectName,
  },
});
