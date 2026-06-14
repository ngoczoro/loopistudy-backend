import * as quizAttemptService from "../services/quizAttemptService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse } from "../utils/response.js";
import {
  serializeQuizAttempt,
  serializeQuizAttemptList,
} from "../serializers/quizAttemptSerializer.js";

export const submitAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const attempt = await quizAttemptService.submitAttempt(
    req.user.userId,
    req.user.role,
    quizId,
    req.body,
  );

  res
    .status(201)
    .json(
      buildSuccessResponse(
        "Quiz attempt submitted successfully",
        serializeQuizAttempt(attempt),
      ),
    );
});

export const listAttempts = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const attempts = await quizAttemptService.listAttemptsForQuiz(
    req.user.userId,
    req.user.role,
    quizId,
  );

  res.json(
    buildSuccessResponse(
      "Quiz attempts fetched successfully",
      serializeQuizAttemptList(attempts),
    ),
  );
});

export const getLatestAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const attempt = await quizAttemptService.getLatestAttemptForQuiz(
    req.user.userId,
    req.user.role,
    quizId,
  );

  if (!attempt) {
    throw ApiError.notFound("No quiz attempts found");
  }

  res.json(
    buildSuccessResponse(
      "Latest quiz attempt fetched successfully",
      serializeQuizAttempt(attempt),
    ),
  );
});

export const getAttemptById = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const attempt = await quizAttemptService.getAttemptById(
    req.user.userId,
    req.user.role,
    attemptId,
  );

  res.json(
    buildSuccessResponse(
      "Quiz attempt fetched successfully",
      serializeQuizAttempt(attempt),
    ),
  );
});
