import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as quizGeneratorService from "../services/quiz-generator.service.js";

export const generateDocumentQuiz = asyncHandler(async (req, res) => {
  const data = await quizGeneratorService.generateQuizFromDocument(
    req.user.userId,
    req.user.role,
    req.params.documentId,
    req.body,
  );

  res.status(201).json(
    buildSuccessResponse("AI quiz generated successfully", data),
  );
});

export const generateSubjectQuiz = asyncHandler(async (req, res) => {
  const data = await quizGeneratorService.generateQuizFromSubject(
    req.user.userId,
    req.params.subjectId,
    req.body,
  );

  res.status(201).json(
    buildSuccessResponse("AI quiz generated successfully", data),
  );
});

export const generatePracticeQuiz = asyncHandler(async (req, res) => {
  const data = await quizGeneratorService.generatePracticeQuiz(
    req.user.userId,
    req.body,
  );

  res.status(201).json(
    buildSuccessResponse("AI quiz generated successfully", data),
  );
});
