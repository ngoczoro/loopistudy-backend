import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as flashcardService from "./flashcard.service.js";

const absoluteUrl = (req, pathname) => {
  const configured = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configured) return `${configured}${pathname}`;
  return `${req.protocol}://${req.get("host")}${pathname}`;
};

export const uploadCardImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("Choose a JPG, PNG, or WebP image.");

  res.status(201).json(
    buildSuccessResponse("Flashcard image uploaded", {
      url: absoluteUrl(req, `/media/flashcards/${req.file.filename}`),
    }),
  );
});

export const suggestPronunciations = asyncHandler(async (req, res) => {
  const data = await flashcardService.suggestPronunciations(req.body.text);
  res.json(
    buildSuccessResponse("Pronunciations ready", {
      text: data.text,
      suggestions: data.suggestions.map((suggestion) => ({
        phonetic: suggestion.phonetic,
        audioUrl: absoluteUrl(req, suggestion.audioPath),
        lang: suggestion.lang,
      })),
    }),
  );
});
