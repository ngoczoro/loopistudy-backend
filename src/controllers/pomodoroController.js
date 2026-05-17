import * as pomodoroService from "../services/pomodoroService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse, getPaginationParams, buildPaginationResponse } from "../utils/response.js";

export const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await pomodoroService.create(userId, req.body);
  res.status(201).json(buildSuccessResponse("PomodoroSession created successfully", result));
});

export const getAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, offset } = getPaginationParams(req.query);
  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;

  const { count, rows } = await pomodoroService.getAll(userId, limit, offset, filters);
  const pagination = buildPaginationResponse(rows, count, page, limit);

  res.json(buildSuccessResponse("PomodoroSessions fetched successfully", pagination.data, pagination.pagination));
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await pomodoroService.getById(userId, id);
  if (!result) throw ApiError.notFound("PomodoroSession not found or you don't have permission");
  res.json(buildSuccessResponse("PomodoroSession fetched successfully", result));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await pomodoroService.update(userId, id, req.body);
  if (!result) throw ApiError.notFound("PomodoroSession not found or you don't have permission");
  res.json(buildSuccessResponse("PomodoroSession updated successfully", result));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const success = await pomodoroService.remove(userId, id);
  if (!success) throw ApiError.notFound("PomodoroSession not found or you don't have permission");
  res.json(buildSuccessResponse("PomodoroSession deleted successfully"));
});
