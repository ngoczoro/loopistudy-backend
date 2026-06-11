import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as aiPlanService from "./ai-plan.service.js";

export const generate = asyncHandler(async (req, res) => {
  const data = await aiPlanService.generate(req.user.userId, req.body);
  res.json(buildSuccessResponse("AI plan preview generated", data));
});

export const apply = asyncHandler(async (req, res) => {
  const data = await aiPlanService.apply(req.user.userId, req.body);
  res.json(buildSuccessResponse("AI plan applied successfully", data));
});

export const chat = asyncHandler(async (req, res) => {
  const data = await aiPlanService.chat(req.user.userId, req.body);
  res.json(buildSuccessResponse("AI plan updated from chat", data));
});

export const analyzeDocument = asyncHandler(async (req, res) => {
  const data = await aiPlanService.analyzeDocument(req.user.userId, req.body);
  res.json(buildSuccessResponse("Document analyzed successfully", data));
});
