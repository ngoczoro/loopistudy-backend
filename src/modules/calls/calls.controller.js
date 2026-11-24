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

export const startMeet = asyncHandler(async (req, res) => {
  const data = await callsService.startMeet(req.user.userId, req.params.groupId);
  res.status(data.created ? 201 : 200).json(buildSuccessResponse("Google Meet ready", data));
});

export const shareMeet = asyncHandler(async (req, res) => {
  const data = await callsService.shareMeet(req.user.userId, req.params.groupId, req.body.url);
  res.json(buildSuccessResponse("Google Meet shared", data));
});

export const endMeet = asyncHandler(async (req, res) => {
  const data = await callsService.endMeet(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Google Meet ended", data));
});
