import { asyncHandler } from "../../../utils/asyncHandler.js";
import { respondWithProgress } from "../../../utils/progressResponse.js";
import * as flashcardGeneratorService from "../services/flashcard-generator.service.js";

// Clients asking for text/event-stream also get progress events (see respondWithProgress).
export const generateDocumentFlashcards = asyncHandler(async (req, res) =>
  respondWithProgress(req, res, {
    status: 200,
    message: "Flashcards drafted from your notes",
    run: (onProgress) =>
      flashcardGeneratorService.generateFlashcardsFromNote(
        req.user.userId,
        req.user.role,
        req.params.documentId,
        { ...req.body, onProgress },
      ),
  }),
);
