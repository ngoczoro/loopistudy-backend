import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as subjectService from "./subject.service.js";

export const list = asyncHandler(async (req, res) => {
  const data = await subjectService.list(req.user.userId);
  res.json(buildSuccessResponse("Subjects fetched successfully", data));
});

export const getById = asyncHandler(async (req, res) => {
  const data = await subjectService.getById(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Subject fetched successfully", data));
});

export const create = asyncHandler(async (req, res) => {
  const data = await subjectService.create(req.user.userId, req.body);
  res
    .status(201)
    .json(buildSuccessResponse("Subject created successfully", data));
});

export const update = asyncHandler(async (req, res) => {
  const data = await subjectService.update(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Subject updated successfully", data));
});

export const remove = asyncHandler(async (req, res) => {
  await subjectService.remove(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Subject deleted successfully"));
});
