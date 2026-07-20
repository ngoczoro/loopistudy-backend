import * as notificationService from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  buildSuccessResponse,
  getPaginationParams,
  buildPaginationResponse,
} from "../utils/response.js";
import {
  serializeNotification,
  serializeNotificationList,
} from "../serializers/notificationSerializer.js";

export const create = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await notificationService.create(userId, req.body);
  res
    .status(201)
    .json(
      buildSuccessResponse(
        "Notification created successfully",
        serializeNotification(result),
      ),
    );
});

export const getAll = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { page, limit, offset } = getPaginationParams(req.query);
  const filters = notificationService.parseListFilters(req.query);

  const { count, rows } = await notificationService.getAll(
    userId,
    limit,
    offset,
    filters,
  );
  const serialized = serializeNotificationList(rows);
  const pagination = buildPaginationResponse(serialized, count, page, limit);

  res.json(
    buildSuccessResponse(
      "Notifications fetched successfully",
      pagination.data,
      pagination.pagination,
    ),
  );
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const result = await notificationService.getById(userId, id);
  if (!result) {
    throw ApiError.notFound("Notification not found or you don't have permission");
  }
  res.json(
    buildSuccessResponse(
      "Notification fetched successfully",
      serializeNotification(result),
    ),
  );
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const payload = notificationService.pickUpdatePayload(req.body);
  if (Object.keys(payload).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  const result = await notificationService.update(userId, id, payload);
  if (!result) {
    throw ApiError.notFound("Notification not found or you don't have permission");
  }
  res.json(
    buildSuccessResponse(
      "Notification updated successfully",
      serializeNotification(result),
    ),
  );
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const result = await notificationService.markAsRead(userId, id);
  if (!result) {
    throw ApiError.notFound("Notification not found or you don't have permission");
  }
  res.json(
    buildSuccessResponse(
      "Notification marked as read",
      serializeNotification(result),
    ),
  );
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const success = await notificationService.remove(userId, id);
  if (!success) {
    throw ApiError.notFound("Notification not found or you don't have permission");
  }
  res.json(buildSuccessResponse("Notification deleted successfully"));
});

export const removeAll = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const deletedCount = await notificationService.removeAll(userId);
  res.json(
    buildSuccessResponse("All notifications deleted successfully", {
      deletedCount,
    }),
  );
});
