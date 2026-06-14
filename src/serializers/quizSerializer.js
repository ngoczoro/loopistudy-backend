const LETTER_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

export const serializeQuizQuestion = (question) => {
  const options = (question?.options ?? []).map((option) => String(option).trim());
  const letter = String(question?.correctAnswer ?? "")
    .trim()
    .toUpperCase()
    .charAt(0);
  const correctIndex =
    question?.correctIndex ?? LETTER_TO_INDEX[letter] ?? 0;

  return {
    question: String(question?.question ?? "").trim(),
    options,
    correctIndex,
    explanation: String(question?.explanation ?? "").trim(),
    difficulty: question?.difficulty ?? "medium",
    ...(question?.sourceTopic
      ? { sourceTopic: String(question.sourceTopic).trim() }
      : {}),
  };
};

export const serializeQuiz = (quiz) => {
  if (!quiz) return null;

  const plain = quiz.get ? quiz.get({ plain: true }) : quiz;
  const questions = Array.isArray(plain.questions) ? plain.questions : [];
  const subject = plain.subject ?? null;
  const sourceDocument = plain.sourceDocument ?? null;

  return {
    id: plain.id,
    subjectId: plain.subjectId ?? plain.subject_id ?? subject?.id ?? null,
    subjectName: subject?.name ?? plain.subjectName ?? null,
    title: plain.title,
    description: plain.description ?? null,
    questions: questions.map(serializeQuizQuestion),
    source: plain.source ?? "manual",
    sourceDocumentId:
      plain.sourceDocumentId ??
      plain.source_document_id ??
      sourceDocument?.id ??
      null,
    sourceDocumentTitle:
      sourceDocument?.title ?? plain.sourceDocumentTitle ?? null,
    aiModel: plain.aiModel ?? plain.ai_model ?? null,
    generationDifficulty:
      plain.generationDifficulty ?? plain.generation_difficulty ?? null,
    generationQuestionCount:
      plain.generationQuestionCount ?? plain.generation_question_count ?? null,
    createdAt: plain.createdAt ?? plain.created_at ?? null,
    updatedAt: plain.updatedAt ?? plain.updated_at ?? null,
  };
};

export const serializeQuizList = (quizzes) =>
  (quizzes ?? []).map(serializeQuiz);

export { serializeQuizAttempt, serializeQuizAttemptList } from "./quizAttemptSerializer.js";
