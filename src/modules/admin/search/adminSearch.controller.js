import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as adminSearchService from "./adminSearch.service.js";

export const searchAdmin = asyncHandler(async (req, res) => {
  const query = req.validatedQuery?.q ?? req.query.q;
  const data = await adminSearchService.searchAdmin(query);

  res.json(buildSuccessResponse("Admin search completed successfully", data));
});
