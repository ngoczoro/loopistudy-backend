import crypto from "crypto";
import fs from "fs";
import ApiError from "../../utils/ApiError.js";
import {
  deleteDocumentFromCloudinary,
  deleteImageFromCloudinary,
  uploadDocumentToCloudinary,
  uploadImageToCloudinary,
} from "../../services/cloudinaryUpload.service.js";
import { getExtension, isImageFile } from "../../shared/utils/contentFileTypes.js";
import * as groupsRepository from "./groups.repository.js";
import * as messagesRepository from "./messages.repository.js";
import { getMembershipOrThrow } from "./groups.access.js";
import {
  serializeLastMessage,
  serializeMessage,
  serializeSharedAttachment,
  serializeSharedLink,
} from "./messages.serializer.js";
import {
  CHAT_ATTACHMENT_FOLDER,
  CHAT_MAX_CONTENT_LENGTH,
  CHAT_MAX_FILES,
  CHAT_PAGE_DEFAULT_LIMIT,
  CHAT_PAGE_MAX_LIMIT,
  SHARED_DEFAULT_LIMIT,
  SHARED_LINK_SCAN_LIMIT,
  SHARED_MAX_LIMIT,
} from "./groups.constants.js";

/** Must match the FE link detection in `src/lib/chatLinks.js`. */
const URL_PATTERN = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;

const extractUrls = (text) =>
  Array.from((text ?? "").matchAll(URL_PATTERN), (match) => match[0]);

const getHostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const clampLimit = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
};

const cleanupTempFiles = (files) => {
  for (const file of files) {
    if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
  }
};

const deleteUploaded = async (attachments) => {
  await Promise.allSettled(
    attachments.map((attachment) =>
      attachment.kind === "image"
        ? deleteImageFromCloudinary(attachment.publicId)
        : deleteDocumentFromCloudinary(attachment.publicId),
    ),
  );
};

const uploadAttachment = async (file) => {
  const base = {
    name: file.originalname.slice(0, 255),
    mimeType: file.mimetype || "application/octet-stream",
    size: file.size,
  };

  if (isImageFile(file)) {
    const uploaded = await uploadImageToCloudinary(file, { folder: CHAT_ATTACHMENT_FOLDER });
    return { ...base, kind: "image", url: uploaded.secureUrl, publicId: uploaded.publicId };
  }

  const ext = getExtension(file.originalname);
  const uploaded = await uploadDocumentToCloudinary(file, {
    folder: CHAT_ATTACHMENT_FOLDER,
    publicId: ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID(),
  });
  return { ...base, kind: "file", url: uploaded.secureUrl, publicId: uploaded.publicId };
};

/** Uploads all files or none: on any failure, already-uploaded files are removed. */
const uploadAttachments = async (files) => {
  const results = await Promise.allSettled(files.map(uploadAttachment));
  const uploaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failure = results.find((result) => result.status === "rejected");

  if (failure) {
    await deleteUploaded(uploaded);
    throw failure.reason;
  }
  return uploaded;
};

/**
 * `{ lastMessage, unreadCount }` per group for the given memberships (all of one user).
 */
export const getChatSummaries = async (memberships) => {
  const summaries = new Map();
  if (memberships.length === 0) return summaries;

  const userId = memberships[0].userId;
  const groupIds = memberships.map((membership) => membership.groupId);
  const [lastMessages, unreadCounts] = await Promise.all([
    messagesRepository.findLastMessages(userId, groupIds),
    messagesRepository.countUnreadByGroup(userId, groupIds),
  ]);

  const lastByGroup = new Map(lastMessages.map((row) => [row.groupId, row]));
  for (const groupId of groupIds) {
    const last = lastByGroup.get(groupId);
    summaries.set(groupId, {
      lastMessage: last ? serializeLastMessage(last) : null,
      unreadCount: unreadCounts.get(groupId) ?? 0,
    });
  }
  return summaries;
};

export const listMessages = async (userId, groupId, query = {}) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const limit = clampLimit(query.limit, CHAT_PAGE_DEFAULT_LIMIT, CHAT_PAGE_MAX_LIMIT);

  let before = null;
  if (query.before) {
    before = await messagesRepository.findMessageInGroup(groupId, query.before);
    if (!before) throw ApiError.badRequest("Cursor `before` không hợp lệ.");
  }

  const rows = await messagesRepository.listMessagesPage({
    groupId,
    clearedAt: membership.clearedAt,
    before,
    limit,
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();

  return {
    items: page.map(serializeMessage),
    nextCursor: hasMore && page.length > 0 ? page[0].id : null,
  };
};

/** Returns the serialized message; realtime fan-out is the caller's concern. */
export const sendMessage = async (userId, groupId, payload = {}, files = []) => {
  try {
    const membership = await getMembershipOrThrow(groupId, userId);

    const content = String(payload.content ?? "").trim();
    if (!content && files.length === 0) {
      throw ApiError.badRequest("Tin nhắn cần có nội dung hoặc ít nhất 1 file.");
    }
    if (content.length > CHAT_MAX_CONTENT_LENGTH) {
      throw ApiError.badRequest(`Tin nhắn tối đa ${CHAT_MAX_CONTENT_LENGTH} ký tự.`);
    }
    if (files.length > CHAT_MAX_FILES) {
      throw ApiError.badRequest(`Tối đa ${CHAT_MAX_FILES} file mỗi lần gửi.`);
    }

    const attachments = await uploadAttachments(files);

    let message;
    try {
      message = await messagesRepository.createMessage({
        groupId,
        senderId: userId,
        content,
        attachments,
      });
    } catch (error) {
      await deleteUploaded(attachments);
      throw error;
    }

    await groupsRepository.updateMembership(membership, { lastReadAt: message.createdAt });

    return serializeMessage(await messagesRepository.findMessageById(message.id));
  } finally {
    cleanupTempFiles(files);
  }
};

export const markRead = async (userId, groupId) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const lastReadAt = new Date();
  await groupsRepository.updateMembership(membership, { lastReadAt });
  return { lastReadAt: lastReadAt.toISOString() };
};

export const clearHistory = async (userId, groupId) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const clearedAt = new Date();
  await groupsRepository.updateMembership(membership, {
    clearedAt,
    lastReadAt: clearedAt,
  });
  return { clearedAt: clearedAt.toISOString() };
};

export const listShared = async (userId, groupId, query = {}) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const limit = clampLimit(query.limit, SHARED_DEFAULT_LIMIT, SHARED_MAX_LIMIT);
  const { clearedAt } = membership;

  if (query.type === "link") {
    const messages = await messagesRepository.listMessagesWithLinks({
      groupId,
      clearedAt,
      limit: SHARED_LINK_SCAN_LIMIT,
    });
    const items = [];
    for (const message of messages) {
      extractUrls(message.content).forEach((url, index) => {
        items.push(serializeSharedLink(message, url, index, getHostname(url)));
      });
      if (items.length >= limit) break;
    }
    return items.slice(0, limit);
  }

  const attachments = await messagesRepository.listAttachmentsByKind({
    groupId,
    clearedAt,
    kind: query.type === "media" ? "image" : "file",
    limit,
  });
  return attachments.map(serializeSharedAttachment);
};
