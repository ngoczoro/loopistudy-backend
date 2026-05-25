import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as plannerService from "./planner.service.js";

export const list = asyncHandler(async (req, res) => {
  const data = await plannerService.list(req.user.userId, req.query.weekStartDate);
  res.json(buildSuccessResponse("Planner sessions fetched successfully", data));
});

export const getById = asyncHandler(async (req, res) => {
  const data = await plannerService.getById(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Planner session fetched successfully", data));
});

export const create = asyncHandler(async (req, res) => {
  const data = await plannerService.create(req.user.userId, req.body);
  res
    .status(201)
    .json(buildSuccessResponse("Planner session created successfully", data));
});

export const update = asyncHandler(async (req, res) => {
  const data = await plannerService.update(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Planner session updated successfully", data));
});

export const remove = asyncHandler(async (req, res) => {
  await plannerService.remove(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Planner session deleted successfully"));
});
