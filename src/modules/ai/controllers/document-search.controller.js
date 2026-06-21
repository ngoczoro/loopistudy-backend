import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as documentSearchService from "../services/document-search.service.js";

export const searchDocuments = asyncHandler(async (req, res) => {
  const data = await documentSearchService.searchDocuments(
    req.user.userId,
    req.user.role,
    req.body,
  );

  res.json(
    buildSuccessResponse("Document search completed successfully", data),
  );
});

export const explainDocumentSearch = asyncHandler(async (req, res) => {
  const data = await documentSearchService.explainDocumentSearch(
    req.user.userId,
    req.user.role,
    req.body,
  );

  res.json(
    buildSuccessResponse("Document search explanation generated successfully", data),
  );
});
