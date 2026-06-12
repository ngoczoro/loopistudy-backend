/** Shared AI request field names for upcoming feature endpoints. */
export const AI_REQUEST_FIELDS = Object.freeze({
  documentId: "documentId",
  subjectId: "subjectId",
  quizId: "quizId",
  question: "question",
  difficulty: "difficulty",
  numberOfQuestions: "numberOfQuestions",
});

/** Documented difficulty values for future quiz generation. */
export const AI_DIFFICULTY_VALUES = Object.freeze([
  "easy",
  "medium",
  "hard",
]);
