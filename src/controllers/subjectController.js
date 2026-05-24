import * as subjectService from "../services/subjectService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse, getPaginationParams, buildPaginationResponse } from "../utils/response.js";

export const create = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await subjectService.create(userId, req.body);
  res.status(201).json(buildSuccessResponse("Subject created successfully", result));
});

export const getAll = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { page, limit, offset } = getPaginationParams(req.query);
  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;

  const { count, rows } = await subjectService.getAll(userId, limit, offset, filters);
  const pagination = buildPaginationResponse(rows, count, page, limit);

  res.json(buildSuccessResponse("Subjects fetched successfully", pagination.data, pagination.pagination));
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const result = await subjectService.getById(userId, id);
  if (!result) throw ApiError.notFound("Subject not found or you don't have permission");
  res.json(buildSuccessResponse("Subject fetched successfully", result));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const result = await subjectService.update(userId, id, req.body);
  if (!result) throw ApiError.notFound("Subject not found or you don't have permission");
  res.json(buildSuccessResponse("Subject updated successfully", result));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const success = await subjectService.remove(userId, id);
  if (!success) throw ApiError.notFound("Subject not found or you don't have permission");
  res.json(buildSuccessResponse("Subject deleted successfully"));
});
