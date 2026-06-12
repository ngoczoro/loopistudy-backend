export const QUIZ_PROMPT_VERSION = "0.1.0";

/** Placeholder builder for future AI Quiz Generator. */
export const buildQuizPrompt = ({
  documentText = "",
  numberOfQuestions = 5,
  difficulty = "medium",
  subjectName = "",
} = {}) => ({
  feature: "quiz",
  version: QUIZ_PROMPT_VERSION,
  instructions:
    "Placeholder system prompt for quiz generation. Implement in a future phase.",
  input: documentText,
  context: {
    numberOfQuestions,
    difficulty,
    subjectName,
  },
});
