import { asyncHandler } from "../../../utils/asyncHandler.js";
import { respondWithProgress } from "../../../utils/progressResponse.js";
import * as quizGeneratorService from "../services/quiz-generator.service.js";

// Clients asking for text/event-stream also get progress events (see respondWithProgress).
const QUIZ_GENERATED = { status: 201, message: "Quiz generated from your notes" };

export const generateDocumentQuiz = asyncHandler(async (req, res) =>
  respondWithProgress(req, res, {
    ...QUIZ_GENERATED,
    run: (onProgress) =>
      quizGeneratorService.generateQuizFromDocument(
        req.user.userId,
        req.user.role,
        req.params.documentId,
        { ...req.body, onProgress },
      ),
  }),
);

export const generateSubjectQuiz = asyncHandler(async (req, res) =>
  respondWithProgress(req, res, {
    ...QUIZ_GENERATED,
    run: (onProgress) =>
      quizGeneratorService.generateQuizFromSubject(req.user.userId, req.params.subjectId, {
        ...req.body,
        onProgress,
      }),
  }),
);

export const generatePracticeQuiz = asyncHandler(async (req, res) =>
  respondWithProgress(req, res, {
    ...QUIZ_GENERATED,
    run: (onProgress) =>
      quizGeneratorService.generatePracticeQuiz(req.user.userId, { ...req.body, onProgress }),
  }),
);
