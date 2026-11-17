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

/**
 * Server-Sent Events version of sendMessage (see assistantService.streamMessage for events).
 * Validation, ownership and rate-limit errors are returned as JSON before the stream opens.
 */
export const streamMessage = async (req, res, next) => {
  let prepared;
  try {
    prepared = await assistantService.prepareQuestion(
      req.user.userId,
      req.params.conversationId,
      req.body,
    );
  } catch (error) {
    next(error);
    return;
  }

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  // Stop generating (and skip saving) when the user closes the page mid-answer.
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  const emit = (event, data) => {
    if (res.writableEnded || controller.signal.aborted) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await assistantService.streamMessage({
      userId: req.user.userId,
      conversation: prepared.conversation,
      content: prepared.content,
      emit,
      signal: controller.signal,
    });
  } catch (error) {
    if (!error.clientAborted && !controller.signal.aborted) {
      console.error("Assistant stream failed:", error);
      emit("error", {
        message:
          error.statusCode && error.statusCode < 500
            ? error.message
            : "The assistant could not answer. Please try again.",
      });
    }
  } finally {
    res.end();
  }
};
