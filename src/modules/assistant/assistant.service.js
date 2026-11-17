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
import { embedQuery, embedTexts } from "./assistant.embedding.js";
import { generateRagAnswer, streamRagAnswer } from "./assistant.llm.js";
import {
  cosineSimilarity,
  rankChunksForTopic,
  retrieveChunks,
} from "./assistant.retrieve.js";

const TOPIC_PASSAGE_MARGIN = 0.15;

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

/** Passages for a question in the conversation scope (keyword + embedding when available). */
const retrieveForQuestion = async (userId, scope, question) => {
  let queryEmbedding = null;
  try {
    queryEmbedding = await embedQuery(question);
  } catch (error) {
    console.warn("⚠ Query embedding unavailable, keyword-only retrieve:", error.message);
  }

  const { contentIds, hits } = await retrieveChunks(userId, scope, question, {
    queryEmbedding,
  });
  return { contentIds, hits, retrieval: queryEmbedding ? "hybrid" : "keyword" };
};

/** Fixed reply when there is nothing to answer from; null when the LLM should answer. */
const replyWithoutGeneration = ({ contentIds, hits }) => {
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
  return null;
};

const answeredReply = (generated, hits, retrieval) => {
  // The models read the passages and found no answer: same reply as an empty search.
  if (generated.refused) {
    return {
      content: NOT_FOUND_MESSAGE,
      answerStatus: ANSWER_STATUS.NOT_FOUND,
      citations: [],
      metadata: {
        provider: "none",
        reason: "models_refused",
        retrieval,
        errors: generated.errors ?? null,
      },
    };
  }

  return {
    content: generated.content,
    answerStatus: ANSWER_STATUS.ANSWERED,
    citations: hits,
    metadata: {
      provider: generated.provider,
      model: generated.model ?? null,
      retrieval,
      errors: generated.errors ?? null,
    },
  };
};

const buildAssistantReply = async (userId, scope, question) => {
  const retrieved = await retrieveForQuestion(userId, scope, question);
  const fixed = replyWithoutGeneration(retrieved);
  if (fixed) return fixed;

  // Answers are grounded only on retrieved passages — no chat history in the prompt
  // (keeps Ollama prompts smaller and avoids follow-up drift / timeouts).
  const generated = await generateRagAnswer({ question, hits: retrieved.hits });
  return answeredReply(generated, retrieved.hits, retrieved.retrieval);
};

/**
 * Ownership, non-empty question and the hourly limit. Runs before any streaming starts so
 * these errors still reach the client as normal JSON responses.
 */
export const prepareQuestion = async (userId, conversationId, payload) => {
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
  return { conversation, content };
};

/** Save the question and its answer together, and title a new conversation from it. */
const saveExchange = async (userId, conversation, content, reply) => {
  const conversationId = conversation.id;
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

export const sendMessage = async (userId, conversationId, payload) => {
  const { conversation, content } = await prepareQuestion(userId, conversationId, payload);
  const reply = await buildAssistantReply(userId, conversation.scope, content);
  return saveExchange(userId, conversation, content, reply);
};

/**
 * Same answer as sendMessage, streamed. Events, in order:
 *   sources { citations }  passages the answer may cite (empty for not_found / no_sources)
 *   token   { text }       next piece of the answer
 *   provider { provider, model }  which model is answering (ollama / openai / extractive)
 *   reset   {}             a provider failed mid-answer: clear the text, the next one restarts
 *   done    { userMessage, assistantMessage, conversation }  saved, sanitized result
 * Nothing is saved when the client disconnects before the end.
 */
export const streamMessage = async ({ userId, conversation, content, emit, signal }) => {
  const retrieved = await retrieveForQuestion(userId, conversation.scope, content);
  const fixed = replyWithoutGeneration(retrieved);

  let reply = fixed;
  if (fixed) {
    emit("sources", { citations: [] });
    emit("token", { text: fixed.content });
  } else {
    emit("sources", { citations: retrieved.hits });
    const generated = await streamRagAnswer({
      question: content,
      hits: retrieved.hits,
      onToken: (text) => emit("token", { text }),
      onReset: () => emit("reset", {}),
      onProvider: (source) => emit("provider", source),
      signal,
    });
    reply = answeredReply(generated, retrieved.hits, retrieved.retrieval);
    if (generated.refused) {
      emit("sources", { citations: [] });
      emit("token", { text: reply.content });
    }
  }

  if (signal?.aborted) return;
  emit("done", await saveExchange(userId, conversation, content, reply));
};

/**
 * Indexed passages about `topic` for other modules (e.g. quiz generation).
 * Scope: one subject when `subjectId` is set, otherwise all of the user's notes and files.
 * Returns [] when nothing is indexed yet or nothing is relevant enough; callers fall back.
 */
export const findTopicPassages = async (userId, { subjectId = null, topic, limit } = {}) => {
  const text = String(topic ?? "").trim();
  if (!text) return [];

  let queryEmbedding = null;
  try {
    queryEmbedding = await embedQuery(text);
  } catch (error) {
    console.warn("⚠ Topic embedding unavailable, keyword-only ranking:", error.message);
  }

  const scope = subjectId ? { type: "subject", subjectId } : { type: "all" };
  const passages = await rankChunksForTopic(userId, scope, text, { queryEmbedding, limit });
  if (!passages.length) return passages;

  // Chunks are ~2000 chars; keep only those close to the best one, not everything above the floor.
  const best = passages[0].score;
  return passages.filter((passage) => passage.score >= best - TOPIC_PASSAGE_MARGIN);
};

/**
 * Cosine similarity of each text to `topic` with the Ask AI embedding model.
 * Null when the model is unavailable, so callers keep their own order.
 */
export const scoreTextsForTopic = async (topic, texts) => {
  if (!texts.length) return [];
  try {
    const [query] = await embedTexts([topic], { isQuery: true });
    const vectors = await embedTexts(texts);
    return vectors.map((vector) => cosineSimilarity(query, vector));
  } catch (error) {
    console.warn("⚠ Topic embedding unavailable, skipping fact ranking:", error.message);
    return null;
  }
};
