import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as goalsService from "./goals.service.js";

export const list = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const data = await goalsService.list(req.user.userId, query);
  res.json(buildSuccessResponse("Study goals fetched successfully", data));
});

export const getById = asyncHandler(async (req, res) => {
  const data = await goalsService.getById(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Study goal fetched successfully", data));
});

export const create = asyncHandler(async (req, res) => {
  const data = await goalsService.create(req.user.userId, req.body);
  res.status(201).json(buildSuccessResponse("Study goal created successfully", data));
});

export const update = asyncHandler(async (req, res) => {
  const data = await goalsService.update(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Study goal updated successfully", data));
});

export const remove = asyncHandler(async (req, res) => {
  await goalsService.remove(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Study goal deleted successfully"));
});
