import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as groupsService from "./groups.service.js";
import * as messagesService from "./messages.service.js";
import * as resourcesService from "./resources.service.js";
import * as tasksService from "./tasks.service.js";

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

export const listMessages = asyncHandler(async (req, res) => {
  const data = await messagesService.listMessages(
    req.user.userId,
    req.params.groupId,
    req.query,
  );
  res.json(buildSuccessResponse("Messages fetched successfully", data));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const data = await messagesService.sendMessage(
    req.user.userId,
    req.params.groupId,
    req.body,
    req.files ?? [],
  );
  res.status(201).json(buildSuccessResponse("Message sent successfully", data));
});

export const markRead = asyncHandler(async (req, res) => {
  const data = await messagesService.markRead(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Messages marked as read", data));
});

export const clearHistory = asyncHandler(async (req, res) => {
  const data = await messagesService.clearHistory(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Chat history cleared", data));
});

export const listShared = asyncHandler(async (req, res) => {
  const data = await messagesService.listShared(
    req.user.userId,
    req.params.groupId,
    req.query,
  );
  res.json(buildSuccessResponse("Shared items fetched successfully", data));
});

export const listResources = asyncHandler(async (req, res) => {
  const data = await resourcesService.listResources(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Group resources fetched successfully", data));
});

export const createResource = asyncHandler(async (req, res) => {
  const data = await resourcesService.createResource(
    req.user.userId,
    req.params.groupId,
    req.body,
  );
  res.status(201).json(buildSuccessResponse("Resource shared successfully", data));
});

export const deleteResource = asyncHandler(async (req, res) => {
  await resourcesService.deleteResource(
    req.user.userId,
    req.params.groupId,
    req.params.resourceId,
  );
  res.json(buildSuccessResponse("Resource removed successfully"));
});

export const listGoals = asyncHandler(async (req, res) => {
  const data = await tasksService.listGoals(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Group goals fetched successfully", data));
});

export const createGoal = asyncHandler(async (req, res) => {
  const data = await tasksService.createGoal(req.user.userId, req.params.groupId, req.body);
  res.status(201).json(buildSuccessResponse("Goal created successfully", data));
});

export const updateGoal = asyncHandler(async (req, res) => {
  const data = await tasksService.updateGoal(
    req.user.userId,
    req.params.groupId,
    req.params.goalId,
    req.body,
  );
  res.json(buildSuccessResponse("Goal updated successfully", data));
});

export const deleteGoal = asyncHandler(async (req, res) => {
  await tasksService.deleteGoal(req.user.userId, req.params.groupId, req.params.goalId);
  res.json(buildSuccessResponse("Goal deleted successfully"));
});

export const listTasks = asyncHandler(async (req, res) => {
  const data = await tasksService.listTasks(req.user.userId, req.params.groupId, req.query);
  res.json(buildSuccessResponse("Group tasks fetched successfully", data));
});

export const createTask = asyncHandler(async (req, res) => {
  const data = await tasksService.createTask(req.user.userId, req.params.groupId, req.body);
  res.status(201).json(buildSuccessResponse("Task created successfully", data));
});

export const updateTask = asyncHandler(async (req, res) => {
  const data = await tasksService.updateTask(
    req.user.userId,
    req.params.groupId,
    req.params.taskId,
    req.body,
  );
  res.json(buildSuccessResponse("Task updated successfully", data));
});

export const deleteTask = asyncHandler(async (req, res) => {
  await tasksService.deleteTask(req.user.userId, req.params.groupId, req.params.taskId);
  res.json(buildSuccessResponse("Task deleted successfully"));
});

export const remindTask = asyncHandler(async (req, res) => {
  const data = await tasksService.remindTask(
    req.user.userId,
    req.params.groupId,
    req.params.taskId,
  );
  res.json(buildSuccessResponse("Reminder sent successfully", data));
});

export const getProgress = asyncHandler(async (req, res) => {
  const data = await tasksService.getProgress(req.user.userId, req.params.groupId);
  res.json(buildSuccessResponse("Group progress fetched successfully", data));
});
