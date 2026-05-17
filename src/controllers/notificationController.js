import * as notificationService from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse, getPaginationParams, buildPaginationResponse } from "../utils/response.js";

export const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await notificationService.create(userId, req.body);
  res.status(201).json(buildSuccessResponse("Notification created successfully", result));
});

export const getAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, offset } = getPaginationParams(req.query);
  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;

  const { count, rows } = await notificationService.getAll(userId, limit, offset, filters);
  const pagination = buildPaginationResponse(rows, count, page, limit);

  res.json(buildSuccessResponse("Notifications fetched successfully", pagination.data, pagination.pagination));
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await notificationService.getById(userId, id);
  if (!result) throw ApiError.notFound("Notification not found or you don't have permission");
  res.json(buildSuccessResponse("Notification fetched successfully", result));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await notificationService.update(userId, id, req.body);
  if (!result) throw ApiError.notFound("Notification not found or you don't have permission");
  res.json(buildSuccessResponse("Notification updated successfully", result));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const success = await notificationService.remove(userId, id);
  if (!success) throw ApiError.notFound("Notification not found or you don't have permission");
  res.json(buildSuccessResponse("Notification deleted successfully"));
});
