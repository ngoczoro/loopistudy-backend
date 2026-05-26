import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as progressFacadeService from "./service.js";

export const getSummary = asyncHandler(async (req, res) => {
  const data = await progressFacadeService.getProgressSummary(req.user.userId);
  res.json(buildSuccessResponse("Progress summary fetched successfully", data));
});

export const getStreaks = asyncHandler(async (req, res) => {
  const data = await progressFacadeService.getProgressStreaks(req.user.userId);
  res.json(buildSuccessResponse("Progress streaks fetched successfully", data));
});

export const getMilestones = asyncHandler(async (req, res) => {
  const data = await progressFacadeService.getProgressMilestones(req.user.userId);
  res.json(buildSuccessResponse("Progress milestones fetched successfully", data));
});
