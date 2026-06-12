import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as summaryService from "../services/summary.service.js";

export const getDocumentSummary = asyncHandler(async (req, res) => {
  const data = await summaryService.getExistingSummary(
    req.user.userId,
    req.user.role,
    req.params.documentId,
  );

  res.json(buildSuccessResponse("AI summary fetched successfully", data));
});

export const generateDocumentSummary = asyncHandler(async (req, res) => {
  const data = await summaryService.generateDocumentSummary(
    req.user.userId,
    req.user.role,
    req.params.documentId,
    req.body,
  );

  res.json(buildSuccessResponse("AI summary generated successfully", data));
});
