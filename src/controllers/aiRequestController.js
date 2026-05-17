import * as aiRequestService from "../services/aiRequestService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse, getPaginationParams, buildPaginationResponse } from "../utils/response.js";

export const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await aiRequestService.create(userId, req.body);
  res.status(201).json(buildSuccessResponse("AIRequest created successfully", result));
});

export const getAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, offset } = getPaginationParams(req.query);
  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;

  const { count, rows } = await aiRequestService.getAll(userId, limit, offset, filters);
  const pagination = buildPaginationResponse(rows, count, page, limit);

  res.json(buildSuccessResponse("AIRequests fetched successfully", pagination.data, pagination.pagination));
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await aiRequestService.getById(userId, id);
  if (!result) throw ApiError.notFound("AIRequest not found or you don't have permission");
  res.json(buildSuccessResponse("AIRequest fetched successfully", result));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await aiRequestService.update(userId, id, req.body);
  if (!result) throw ApiError.notFound("AIRequest not found or you don't have permission");
  res.json(buildSuccessResponse("AIRequest updated successfully", result));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const success = await aiRequestService.remove(userId, id);
  if (!success) throw ApiError.notFound("AIRequest not found or you don't have permission");
  res.json(buildSuccessResponse("AIRequest deleted successfully"));
});
