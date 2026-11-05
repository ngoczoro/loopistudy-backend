const toIso = (value) => (value ? new Date(value).toISOString() : null);

export const serializeSource = (item, indexRow = null) => ({
  id: item.id,
  title: item.title,
  type: item.type,
  subject: item.subject
    ? { id: item.subject.id, name: item.subject.name }
    : item.subjectId
      ? { id: item.subjectId, name: null }
      : null,
  indexStatus: indexRow?.status ?? "not_indexed",
  chunkCount: indexRow?.chunkCount ?? 0,
  indexedAt: toIso(indexRow?.indexedAt),
  updatedAt: toIso(item.updatedAt),
});

export const serializeMessage = (message) => ({
  id: message.id,
  conversationId: message.conversationId,
  role: message.role,
  content: message.content,
  answerStatus: message.answerStatus ?? null,
  citations: Array.isArray(message.citations) ? message.citations : [],
  metadata: message.metadata ?? null,
  createdAt: toIso(message.createdAt),
});

export const serializeConversation = (conversation, extras = {}) => ({
  id: conversation.id,
  title: conversation.title,
  scope: conversation.scope ?? { type: "all" },
  messageCount: extras.messageCount ?? 0,
  lastMessageAt: toIso(extras.lastMessageAt),
  createdAt: toIso(conversation.createdAt),
  updatedAt: toIso(conversation.updatedAt),
});
