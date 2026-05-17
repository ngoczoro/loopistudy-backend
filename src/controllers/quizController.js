import * as quizService from "../services/quizService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse, getPaginationParams, buildPaginationResponse } from "../utils/response.js";

export const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await quizService.create(userId, req.body);
  res.status(201).json(buildSuccessResponse("Quiz created successfully", result));
});

export const getAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, offset } = getPaginationParams(req.query);
  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;

  const { count, rows } = await quizService.getAll(userId, limit, offset, filters);
  const pagination = buildPaginationResponse(rows, count, page, limit);

  res.json(buildSuccessResponse("Quizs fetched successfully", pagination.data, pagination.pagination));
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await quizService.getById(userId, id);
  if (!result) throw ApiError.notFound("Quiz not found or you don't have permission");
  res.json(buildSuccessResponse("Quiz fetched successfully", result));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await quizService.update(userId, id, req.body);
  if (!result) throw ApiError.notFound("Quiz not found or you don't have permission");
  res.json(buildSuccessResponse("Quiz updated successfully", result));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const success = await quizService.remove(userId, id);
  if (!success) throw ApiError.notFound("Quiz not found or you don't have permission");
  res.json(buildSuccessResponse("Quiz deleted successfully"));
});
