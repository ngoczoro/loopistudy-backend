import { serializeUserSummary } from "./groups.serializer.js";

const toIso = (value) => (value ? new Date(value).toISOString() : null);

export const serializeAttachment = (attachment) => ({
  id: attachment.id,
  kind: attachment.kind,
  name: attachment.name,
  mimeType: attachment.mimeType,
  size: attachment.size,
  url: attachment.url,
});

export const serializeMessage = (message) => ({
  id: message.id,
  groupId: message.groupId,
  sender: serializeUserSummary(message.sender),
  content: message.content ?? "",
  attachments: (message.attachments ?? []).map(serializeAttachment),
  createdAt: toIso(message.createdAt),
});

/** Row from `findLastMessages` (raw SQL). */
export const serializeLastMessage = (row) => ({
  id: row.id,
  content: row.content ?? "",
  attachmentCount: row.attachmentCount ?? 0,
  sender: row.senderId
    ? {
        userId: row.senderId,
        fullName: row.senderName,
        avatarUrl: row.senderAvatarUrl ?? null,
      }
    : null,
  createdAt: toIso(row.createdAt),
});

export const serializeSharedAttachment = (attachment) => ({
  ...serializeAttachment(attachment),
  messageId: attachment.messageId,
  sender: serializeUserSummary(attachment.message?.sender),
  createdAt: toIso(attachment.message?.createdAt ?? attachment.createdAt),
});

export const serializeSharedLink = (message, url, index, hostname) => ({
  id: `${message.id}-link-${index}`,
  messageId: message.id,
  kind: "link",
  name: hostname,
  mimeType: null,
  size: null,
  url,
  sender: serializeUserSummary(message.sender),
  createdAt: toIso(message.createdAt),
});
