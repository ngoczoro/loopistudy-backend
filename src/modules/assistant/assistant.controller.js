import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as assistantService from "./assistant.service.js";

export const listSources = asyncHandler(async (req, res) => {
  const data = await assistantService.listSources(req.user.userId);
  res.json(buildSuccessResponse("Assistant sources fetched successfully", data));
});

export const listConversations = asyncHandler(async (req, res) => {
  const data = await assistantService.listConversations(req.user.userId);
  res.json(buildSuccessResponse("Conversations fetched successfully", data));
});

export const createConversation = asyncHandler(async (req, res) => {
  const data = await assistantService.createConversation(req.user.userId, req.body);
  res.status(201).json(buildSuccessResponse("Conversation created successfully", data));
});

export const updateConversation = asyncHandler(async (req, res) => {
  const data = await assistantService.updateConversation(
    req.user.userId,
    req.params.conversationId,
    req.body,
  );
  res.json(buildSuccessResponse("Conversation updated successfully", data));
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await assistantService.deleteConversation(req.user.userId, req.params.conversationId);
  res.json(buildSuccessResponse("Conversation deleted successfully"));
});

export const listMessages = asyncHandler(async (req, res) => {
  const data = await assistantService.listMessages(
    req.user.userId,
    req.params.conversationId,
  );
  res.json(buildSuccessResponse("Messages fetched successfully", data));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const data = await assistantService.sendMessage(
    req.user.userId,
    req.params.conversationId,
    req.body,
  );
  res.status(201).json(buildSuccessResponse("Message sent successfully", data));
});
