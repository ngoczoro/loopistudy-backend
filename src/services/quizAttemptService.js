import ApiError from "../utils/ApiError.js";
import { ROLES } from "../config/constants.js";
import sequelize from "../config/database.js";
import { normalizeDurationSeconds } from "../utils/quizDuration.js";
import { serializeQuizQuestion } from "../serializers/quizSerializer.js";
import * as quizService from "./quizService.js";
import * as quizAttemptRepository from "../repositories/quizAttemptRepository.js";

const INDEX_TO_LETTER = ["A", "B", "C", "D", "E", "F", "G", "H"];

const indexToLetter = (index) => {
  if (typeof index !== "number" || index < 0) {
    return null;
  }

  return INDEX_TO_LETTER[index] ?? String.fromCharCode(65 + index);
};

const normalizeQuizQuestions = (questions) =>
  (Array.isArray(questions) ? questions : []).map(serializeQuizQuestion);

const buildAnswerMap = (submittedAnswers, totalQuestions) => {
  const answerMap = new Map();

  for (const entry of submittedAnswers) {
    const questionIndex = entry.questionIndex;

    if (answerMap.has(questionIndex)) {
      throw ApiError.badRequest(
        `Duplicate answer for question index ${questionIndex}`,
      );
    }

    if (questionIndex >= totalQuestions) {
      throw ApiError.badRequest(
        `Invalid questionIndex ${questionIndex}. Quiz has ${totalQuestions} questions.`,
      );
    }

    const selectedIndex = entry.selectedIndex;
    if (typeof selectedIndex !== "number" || selectedIndex < 0) {
      throw ApiError.badRequest(
        `Invalid selectedIndex for question ${questionIndex}`,
      );
    }

    answerMap.set(questionIndex, selectedIndex);
  }

  for (let index = 0; index < totalQuestions; index += 1) {
    if (!answerMap.has(index)) {
      throw ApiError.badRequest(`Missing answer for question ${index}`);
    }
  }

  return answerMap;
};

export const gradeQuizAttempt = (quizQuestions, submittedAnswers) => {
  const questions = normalizeQuizQuestions(quizQuestions);
  const totalQuestions = questions.length;

  if (totalQuestions === 0) {
    throw ApiError.badRequest("Quiz has no questions");
  }

  const answerMap = buildAnswerMap(submittedAnswers, totalQuestions);

  const normalizedAnswers = questions.map((question, questionIndex) => {
    const selectedIndex = answerMap.get(questionIndex);

    if (selectedIndex >= question.options.length) {
      throw ApiError.badRequest(
        `Invalid selectedIndex for question ${questionIndex}`,
      );
    }

    const correctIndex = question.correctIndex;
    const isCorrect = selectedIndex === correctIndex;

    return {
      questionIndex,
      question: question.question,
      selectedIndex,
      selectedAnswer: indexToLetter(selectedIndex),
      correctIndex,
      correctAnswer: indexToLetter(correctIndex),
      isCorrect,
      explanation: question.explanation ?? "",
      ...(question.sourceTopic ? { sourceTopic: question.sourceTopic } : {}),
    };
  });

  const correctCount = normalizedAnswers.filter((item) => item.isCorrect).length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  return {
    totalQuestions,
    correctCount,
    scorePercentage,
    answers: normalizedAnswers,
  };
};

const getAccessibleQuiz = async (userId, role, quizId) => {
  if (role === ROLES.ADMIN) {
    const { Quiz } = sequelize.models;
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      throw ApiError.notFound("Quiz not found");
    }
    return quiz;
  }

  const quiz = await quizService.getById(userId, quizId);
  if (!quiz) {
    throw ApiError.notFound("Quiz not found or you don't have permission");
  }

  return quiz;
};

export const submitAttempt = async (
  userId,
  role,
  quizId,
  { answers, startedAt, durationSeconds } = {},
) => {
  const quiz = await getAccessibleQuiz(userId, role, quizId);
  const graded = gradeQuizAttempt(quiz.questions, answers);
  const submittedAt = new Date();
  const resolvedDuration = normalizeDurationSeconds(durationSeconds, {
    startedAt,
    submittedAt,
  });
  const resolvedStartedAt =
    startedAt && Number.isFinite(new Date(startedAt).getTime())
      ? new Date(startedAt)
      : null;

  const attempt = await quizAttemptRepository.create({
    quizId,
    userId,
    answers: graded.answers,
    totalQuestions: graded.totalQuestions,
    correctCount: graded.correctCount,
    scorePercentage: graded.scorePercentage,
    startedAt: resolvedStartedAt,
    submittedAt,
    durationSeconds: resolvedDuration,
    score: graded.correctCount,
    total: graded.totalQuestions,
    timeSpentSeconds: resolvedDuration,
  });

  return attempt;
};

export const listAttemptsForQuiz = async (userId, role, quizId) => {
  await getAccessibleQuiz(userId, role, quizId);

  return quizAttemptRepository.findByQuizAndUser(quizId, userId);
};

export const getLatestAttemptForQuiz = async (userId, role, quizId) => {
  await getAccessibleQuiz(userId, role, quizId);

  return quizAttemptRepository.findLatestByQuizAndUser(quizId, userId);
};

export const getAttemptById = async (userId, role, attemptId) => {
  if (role === ROLES.ADMIN) {
    const attempt = await quizAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound("Quiz attempt not found");
    }
    return attempt;
  }

  const attempt = await quizAttemptRepository.findByIdAndUser(
    attemptId,
    userId,
  );

  if (!attempt) {
    throw ApiError.notFound("Quiz attempt not found or you don't have permission");
  }

  return attempt;
};
