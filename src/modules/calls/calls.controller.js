import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import { callsService } from "./calls.service.js";

export const issueToken = asyncHandler(async (req, res) => {
  const data = await callsService.issueToken(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Call token issued successfully", data));
});

export const getStatus = asyncHandler(async (req, res) => {
  const data = await callsService.getCallStatus(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Call status fetched successfully", data));
});
