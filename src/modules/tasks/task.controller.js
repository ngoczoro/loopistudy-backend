import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  buildPaginationResponse,
  buildSuccessResponse,
  getPaginationParams,
} from "../../utils/response.js";
import * as taskService from "./task.service.js";

export const list = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await taskService.list(req.user.userId, query, {
    limit,
    offset,
  });

  const pagination = buildPaginationResponse(items, total, page, limit);

  res.json(
    buildSuccessResponse(
      "Tasks fetched successfully",
      pagination.data,
      pagination.pagination,
    ),
  );
});

export const getSummary = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const data = await taskService.getSummary(req.user.userId, query);
  res.json(buildSuccessResponse("Task summary fetched successfully", data));
});

export const getById = asyncHandler(async (req, res) => {
  const data = await taskService.getById(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Task fetched successfully", data));
});

export const create = asyncHandler(async (req, res) => {
  const data = await taskService.create(req.user.userId, req.body);
  res.status(201).json(buildSuccessResponse("Task created successfully", data));
});

export const update = asyncHandler(async (req, res) => {
  const data = await taskService.update(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Task updated successfully", data));
});

export const complete = asyncHandler(async (req, res) => {
  const data = await taskService.complete(
    req.user.userId,
    req.params.id,
    req.body.completed,
  );
  res.json(buildSuccessResponse("Task completion updated successfully", data));
});

export const remove = asyncHandler(async (req, res) => {
  await taskService.remove(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Task deleted successfully"));
});
