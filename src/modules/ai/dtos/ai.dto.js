/** Shared AI request field names for upcoming feature endpoints. */
export const AI_REQUEST_FIELDS = Object.freeze({
  documentId: "documentId",
  subjectId: "subjectId",
  quizId: "quizId",
  question: "question",
  difficulty: "difficulty",
  numberOfQuestions: "numberOfQuestions",
});

/** Documented difficulty values for quiz generation. */
export const AI_DIFFICULTY_VALUES = Object.freeze([
  "mixed",
  "easy",
  "medium",
  "hard",
]);

/** Allowed AI quiz question counts. */
export const AI_QUIZ_QUESTION_COUNTS = Object.freeze([5, 10, 15, 20]);
