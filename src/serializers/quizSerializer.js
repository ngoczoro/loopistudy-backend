export const serializeQuiz = (quiz) => ({
  id: quiz.id,
  subjectId: quiz.subjectId ?? null,
  title: quiz.title,
  questions: quiz.questions ?? [],
  createdAt: quiz.createdAt,
  updatedAt: quiz.updatedAt,
});

export const serializeQuizAttempt = (attempt) => ({
  id: attempt.id,
  quizId: attempt.quizId,
  score: attempt.score,
  total: attempt.total,
  timeSpentSeconds: attempt.timeSpentSeconds ?? null,
  answers: attempt.answers ?? {},
  createdAt: attempt.createdAt,
});

export const serializeQuizList = (quizzes) => quizzes.map(serializeQuiz);
