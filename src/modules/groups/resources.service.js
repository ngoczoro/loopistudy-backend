import ApiError from "../../utils/ApiError.js";
import { contentService } from "../content/index.js";
import * as resourcesRepository from "./resources.repository.js";
import { getMembershipOrThrow } from "./groups.access.js";
import { serializeResource } from "./resources.serializer.js";
import { GROUP_ROLE, RESOURCE_NOTE_EXCERPT_MAX } from "./groups.constants.js";

const toPlainText = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Snapshot of the sharer's own content item. `/content/*` is owner-only, so
 * other members read notes/files through this copy.
 */
const buildRefSnapshot = async (userId, type, refId) => {
  const item = await contentService.getById(userId, refId);
  if (item.type !== type) {
    throw ApiError.badRequest(`Tài liệu được chọn không phải loại "${type}".`);
  }

  if (type === "note") {
    return {
      item,
      snapshot: {
        contentId: item.id,
        title: item.title,
        excerpt: toPlainText(item.content).slice(0, RESOURCE_NOTE_EXCERPT_MAX),
        fileUrl: null,
        fileName: null,
        mimeType: null,
        fileSize: null,
      },
    };
  }

  if (!item.fileUrl) throw ApiError.badRequest("File này chưa có đường dẫn để chia sẻ.");
  return {
    item,
    snapshot: {
      contentId: item.id,
      title: item.title,
      excerpt: null,
      fileUrl: item.fileUrl,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
    },
  };
};

export const listResources = async (userId, groupId) => {
  await getMembershipOrThrow(groupId, userId);
  const resources = await resourcesRepository.listByGroup(groupId);
  return resources.map(serializeResource);
};

export const createResource = async (userId, groupId, payload) => {
  await getMembershipOrThrow(groupId, userId);

  const data = {
    groupId,
    sharedBy: userId,
    type: payload.type,
    title: payload.title?.trim(),
    description: payload.description?.trim() || null,
    url: null,
    refId: null,
    refSnapshot: null,
  };

  if (payload.type === "link") {
    data.url = payload.url.trim();
  } else {
    const { item, snapshot } = await buildRefSnapshot(userId, payload.type, payload.refId);
    data.refId = item.id;
    data.refSnapshot = snapshot;
    data.title ||= item.title;
  }

  const resource = await resourcesRepository.create(data);
  return serializeResource(await resourcesRepository.findById(resource.id));
};

export const deleteResource = async (userId, groupId, resourceId) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const resource = await resourcesRepository.findInGroup(groupId, resourceId);
  if (!resource) throw ApiError.notFound("Không tìm thấy tài liệu trong nhóm.");

  const canDelete =
    membership.role === GROUP_ROLE.OWNER || resource.sharedBy === userId;
  if (!canDelete) {
    throw ApiError.forbidden("Chỉ người chia sẻ hoặc trưởng nhóm mới xóa được tài liệu này.");
  }

  await resourcesRepository.remove(resource);
};
