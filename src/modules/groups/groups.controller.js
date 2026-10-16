import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as groupsService from "./groups.service.js";

export const list = asyncHandler(async (req, res) => {
  const data = await groupsService.listMyGroups(req.user.userId);
  res.json(buildSuccessResponse("Groups fetched successfully", data));
});

export const create = asyncHandler(async (req, res) => {
  const data = await groupsService.createGroup(req.user.userId, req.body);
  res.status(201).json(buildSuccessResponse("Group created successfully", data));
});

export const getById = asyncHandler(async (req, res) => {
  const data = await groupsService.getGroup(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Group fetched successfully", data));
});

export const update = asyncHandler(async (req, res) => {
  const data = await groupsService.updateGroup(
    req.user.userId,
    req.params.groupId,
    req.body ?? {},
    req.file,
  );
  res.json(buildSuccessResponse("Group updated successfully", data));
});

export const remove = asyncHandler(async (req, res) => {
  await groupsService.deleteGroup(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Group deleted successfully"));
});

export const join = asyncHandler(async (req, res) => {
  const data = await groupsService.joinGroup(req.user.userId, req.body.inviteCode);
  res.json(buildSuccessResponse("Joined group successfully", data));
});

export const leave = asyncHandler(async (req, res) => {
  await groupsService.leaveGroup(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Left group successfully"));
});

export const regenerateInviteCode = asyncHandler(async (req, res) => {
  const data = await groupsService.regenerateInviteCode(
    req.user.userId,
    req.params.groupId,
  );
  res.json(buildSuccessResponse("Invite code regenerated successfully", data));
});

export const updateMySettings = asyncHandler(async (req, res) => {
  const data = await groupsService.updateMySettings(
    req.user.userId,
    req.params.groupId,
    req.body,
  );
  res.json(buildSuccessResponse("Group settings updated successfully", data));
});

export const listMembers = asyncHandler(async (req, res) => {
  const data = await groupsService.listMembers(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Group members fetched successfully", data));
});

export const removeMember = asyncHandler(async (req, res) => {
  await groupsService.removeMember(
    req.user.userId,
    req.params.groupId,
    req.params.userId,
  );
  res.json(buildSuccessResponse("Member removed successfully"));
});
