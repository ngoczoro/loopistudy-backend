import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as flashcardGeneratorService from "../services/flashcard-generator.service.js";

export const generateDocumentFlashcards = asyncHandler(async (req, res) => {
  const data = await flashcardGeneratorService.generateFlashcardsFromNote(
    req.user.userId,
    req.user.role,
    req.params.documentId,
    req.body,
  );

  res.status(200).json(
    buildSuccessResponse("AI flashcards generated successfully", data),
  );
});
