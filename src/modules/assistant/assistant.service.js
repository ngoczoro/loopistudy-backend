import sequelize from "../../config/database.js";
import ApiError from "../../utils/ApiError.js";
import * as assistantRepository from "./assistant.repository.js";
import {
  serializeConversation,
  serializeMessage,
  serializeSource,
} from "./assistant.serializer.js";
import {
  ANSWER_STATUS,
  DEFAULT_CONVERSATION_TITLE,
  MESSAGE_ROLE,
  NOT_FOUND_MESSAGE,
  NO_SOURCES_MESSAGE,
  QUESTIONS_PER_HOUR_LIMIT,
  SCOPE_TYPE,
  TITLE_FROM_QUESTION_MAX,
} from "./assistant.constants.js";
import { embedQuery } from "./assistant.embedding.js";
import { generateRagAnswer } from "./assistant.llm.js";
import { retrieveChunks } from "./assistant.retrieve.js";

const requireOwnedConversation = async (userId, conversationId) => {
  const conversation = await assistantRepository.findConversationForUser(
    conversationId,
    userId,
  );
  if (!conversation) throw ApiError.notFound("Conversation not found");
  return conversation;
};

const validateScope = async (userId, scope = { type: SCOPE_TYPE.ALL }) => {
  if (!scope || scope.type === SCOPE_TYPE.ALL) return { type: SCOPE_TYPE.ALL };

  if (scope.type === SCOPE_TYPE.SUBJECT) {
    const exists = await assistantRepository.subjectExistsForUser(userId, scope.subjectId);
    if (!exists) throw ApiError.badRequest("Subject not found");
    const docs = await assistantRepository.countContentBySubject(userId, scope.subjectId);
    if (docs === 0) throw ApiError.badRequest("Subject has no documents");
    return { type: SCOPE_TYPE.SUBJECT, subjectId: scope.subjectId };
  }

  if (scope.type === SCOPE_TYPE.DOCUMENTS) {
    const ids = [...new Set(scope.documentIds ?? [])];
    if (ids.length === 0) throw ApiError.badRequest("Choose at least one document");
    const owned = await assistantRepository.findOwnedContentIds(userId, ids);
    if (owned.length !== ids.length) {
      throw ApiError.badRequest("One or more documents were not found");
    }
    return { type: SCOPE_TYPE.DOCUMENTS, documentIds: ids };
  }

  throw ApiError.badRequest("Invalid scope");
};

const conversationView = async (conversation) => {
  const stats = await assistantRepository.countMessagesByConversationIds([conversation.id]);
  const extra = stats.get(conversation.id) ?? { messageCount: 0, lastMessageAt: null };
  return serializeConversation(conversation, extra);
};

export const listSources = async (userId) => {
  const items = await assistantRepository.listAskableContent(userId);
  return items
    .map((item) => serializeSource(item, item.indexStatus))
    .filter((source) => source.indexStatus !== "unsupported");
};

export const listConversations = async (userId) => {
  const conversations = await assistantRepository.listConversationsByUser(userId);
  const stats = await assistantRepository.countMessagesByConversationIds(
    conversations.map((item) => item.id),
  );
  return conversations
    .map((conversation) =>
      serializeConversation(
        conversation,
        stats.get(conversation.id) ?? { messageCount: 0, lastMessageAt: null },
      ),
    )
    .sort((a, b) =>
      (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
    );
};

export const createConversation = async (userId, payload = {}) => {
  const scope = await validateScope(userId, payload.scope);
  const title = payload.title?.trim() || DEFAULT_CONVERSATION_TITLE;
  const conversation = await assistantRepository.createConversation({
    userId,
    title,
    titleEdited: Boolean(payload.title?.trim()),
    scope,
  });
  return conversationView(conversation);
};

export const updateConversation = async (userId, conversationId, payload = {}) => {
  const conversation = await requireOwnedConversation(userId, conversationId);
  const changes = {};
  if (payload.title !== undefined) {
    changes.title = payload.title.trim();
    changes.titleEdited = true;
  }
  if (payload.scope !== undefined) {
    changes.scope = await validateScope(userId, payload.scope);
  }
  await assistantRepository.updateConversation(conversation, changes);
  return conversationView(conversation);
};

export const deleteConversation = async (userId, conversationId) => {
  const conversation = await requireOwnedConversation(userId, conversationId);
  await assistantRepository.deleteConversation(conversation);
};

export const listMessages = async (userId, conversationId) => {
  await requireOwnedConversation(userId, conversationId);
  const messages = await assistantRepository.listMessages(conversationId);
  return messages.map(serializeMessage);
};

const buildAssistantReply = async (userId, conversationId, scope, question) => {
  let queryEmbedding = null;
  try {
    queryEmbedding = await embedQuery(question);
  } catch (error) {
    console.warn("⚠ Query embedding unavailable, keyword-only retrieve:", error.message);
  }

  const { contentIds, hits } = await retrieveChunks(userId, scope, question, {
    queryEmbedding,
  });

  if (contentIds.length === 0) {
    return {
      content: NO_SOURCES_MESSAGE,
      answerStatus: ANSWER_STATUS.NO_SOURCES,
      citations: [],
      metadata: { provider: "none", reason: "no_indexed_sources" },
    };
  }

  if (hits.length === 0) {
    return {
      content: NOT_FOUND_MESSAGE,
      answerStatus: ANSWER_STATUS.NOT_FOUND,
      citations: [],
      metadata: { provider: "retrieve", reason: "no_matching_chunks" },
    };
  }

  // Answers are grounded only on retrieved passages — no chat history in the prompt
  // (keeps Ollama prompts smaller and avoids follow-up drift / timeouts).
  const generated = await generateRagAnswer({ question, hits });
  return {
    content: generated.content,
    answerStatus: ANSWER_STATUS.ANSWERED,
    citations: hits,
    metadata: {
      provider: generated.provider,
      model: generated.model ?? null,
      retrieval: queryEmbedding ? "hybrid" : "keyword",
      errors: generated.errors ?? null,
    },
  };
};

export const sendMessage = async (userId, conversationId, payload) => {
  const conversation = await requireOwnedConversation(userId, conversationId);
  const content = String(payload.content ?? "").trim();
  if (!content) throw ApiError.badRequest("Question is required");

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const asked = await assistantRepository.countUserQuestionsSince(userId, since);
  if (asked >= QUESTIONS_PER_HOUR_LIMIT) {
    throw new ApiError(
      429,
      `Bạn đã hỏi ${QUESTIONS_PER_HOUR_LIMIT} câu trong một giờ. Hãy thử lại sau.`,
    );
  }

  const reply = await buildAssistantReply(
    userId,
    conversationId,
    conversation.scope,
    content,
  );

  const result = await sequelize.transaction(async (transaction) => {
    const userMessage = await assistantRepository.createMessage(
      {
        conversationId,
        role: MESSAGE_ROLE.USER,
        content,
        answerStatus: null,
        citations: [],
      },
      { transaction },
    );

    const assistantMessage = await assistantRepository.createMessage(
      {
        conversationId,
        role: MESSAGE_ROLE.ASSISTANT,
        content: reply.content,
        answerStatus: reply.answerStatus,
        citations: reply.citations,
        metadata: reply.metadata,
      },
      { transaction },
    );

    const titleChanges = { updatedAt: new Date() };
    if (!conversation.titleEdited && conversation.title === DEFAULT_CONVERSATION_TITLE) {
      titleChanges.title = content.slice(0, TITLE_FROM_QUESTION_MAX);
    }
    await assistantRepository.updateConversation(conversation, titleChanges, { transaction });

    return { userMessage, assistantMessage };
  });

  const refreshed = await requireOwnedConversation(userId, conversationId);
  return {
    userMessage: serializeMessage(result.userMessage),
    assistantMessage: serializeMessage(result.assistantMessage),
    conversation: await conversationView(refreshed),
  };
};
