import { normalizeDurationSeconds } from "../utils/quizDuration.js";

export const computeWeakTopics = (answers = []) => {
  const topics = new Set();

  for (const item of answers) {
    if (item?.isCorrect === false) {
      const topic = String(item?.sourceTopic ?? "").trim();
      if (topic) {
        topics.add(topic);
      }
    }
  }

  return [...topics];
};

export const serializeQuizAttempt = (attempt) => {
  if (!attempt) return null;

  const plain = attempt.get ? attempt.get({ plain: true }) : attempt;
  const answers = Array.isArray(plain.answers) ? plain.answers : [];
  const weakTopics = computeWeakTopics(answers);
  const startedAt = plain.startedAt ?? plain.started_at ?? null;
  const submittedAt =
    plain.submittedAt ??
    plain.submitted_at ??
    plain.createdAt ??
    plain.created_at ??
    null;
  const durationSeconds = normalizeDurationSeconds(
    plain.durationSeconds ??
      plain.duration_seconds ??
      plain.timeSpentSeconds ??
      plain.time_spent_seconds ??
      null,
    { startedAt, submittedAt },
  );

  return {
    id: plain.id,
    quizId: plain.quizId ?? plain.quiz_id,
    userId: plain.userId ?? plain.user_id ?? null,
    totalQuestions:
      plain.totalQuestions ??
      plain.total_questions ??
      plain.total ??
      0,
    correctCount:
      plain.correctCount ??
      plain.correct_count ??
      plain.score ??
      0,
    scorePercentage: Number(
      plain.scorePercentage ?? plain.score_percentage ?? 0,
    ),
    startedAt,
    submittedAt,
    durationSeconds,
    answers,
    weakTopics,
    createdAt: plain.createdAt ?? plain.created_at ?? null,
    updatedAt: plain.updatedAt ?? plain.updated_at ?? null,
  };
};

export const serializeQuizAttemptList = (attempts) =>
  (attempts ?? []).map(serializeQuizAttempt);
