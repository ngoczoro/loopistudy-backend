export const EXPLANATION_PROMPT_VERSION = "0.1.0";

/** Placeholder builder for future AI Quiz Explanation. */
export const buildExplanationPrompt = ({
  question = "",
  userAnswer = "",
  correctAnswer = "",
  contextText = "",
} = {}) => ({
  feature: "explanation",
  version: EXPLANATION_PROMPT_VERSION,
  instructions:
    "Placeholder system prompt for quiz answer explanations. Implement in a future phase.",
  input: contextText,
  context: {
    question,
    userAnswer,
    correctAnswer,
  },
});
