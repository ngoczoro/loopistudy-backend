import { CONTENT_TYPE } from "../../config/constants.js";
import ApiError from "../../utils/ApiError.js";
import {
  deleteDocumentFromCloudinary,
  deleteImageFromCloudinary,
} from "../../services/cloudinaryUpload.service.js";
import {
  assertTextFileItem,
  fetchDocPreview,
  fetchExcelPreview,
  fetchTextContent,
} from "../../services/contentPreview.service.js";
import { isImageFile } from "../../shared/utils/contentFileTypes.js";
import { assertOwned } from "../subjects/index.js";
import * as contentRepository from "./content.repository.js";
import {
  serializeContentItem,
  serializeContentList,
} from "./content.serializer.js";

const normalizeSubjectId = (subjectId) => {
  if (
    subjectId === undefined ||
    subjectId === null ||
    subjectId === "" ||
    subjectId === "null"
  ) {
    return null;
  }
  return subjectId;
};

const assertSubjectIfProvided = async (userId, subjectId) => {
  const normalized = normalizeSubjectId(subjectId);
  if (!normalized) return null;

  await assertOwned(userId, normalized);
  return normalized;
};

const getOwnedOrThrow = async (userId, id) => {
  const item = await contentRepository.findByIdAndUserId(id, userId);
  if (!item) {
    throw ApiError.notFound("Content not found");
  }
  return item;
};

const getExistingOrThrow = async (id) => {
  const item = await contentRepository.findById(id);
  if (!item) {
    throw ApiError.notFound("Content not found");
  }
  return item;
};

const getExistingFileOrThrow = async (id) => {
  const item = await getExistingOrThrow(id);
  if (item.type !== CONTENT_TYPE.FILE) {
    throw ApiError.badRequest("Preview is only available for file content");
  }
  return item;
};

const getOwnedFileOrThrow = async (userId, id) => {
  const item = await getOwnedOrThrow(userId, id);
  if (item.type !== CONTENT_TYPE.FILE) {
    throw ApiError.badRequest("Preview is only available for file content");
  }
  return item;
};

const extractLinkUrl = (payload) => payload.content || payload.url;

const extractFileMetadata = (file, uploadResult) => ({
  fileName: file.originalname,
  fileSizeBytes: file.size,
  fileMime: file.mimetype,
  fileUrl: uploadResult.fileUrl,
  cloudinaryPublicId: uploadResult.cloudinaryPublicId,
});

const deleteCloudinaryAsset = async (item) => {
  if (!item?.cloudinaryPublicId) return;

  try {
    if (isImageFile(item)) {
      await deleteImageFromCloudinary(item.cloudinaryPublicId);
    } else {
      await deleteDocumentFromCloudinary(item.cloudinaryPublicId);
    }
  } catch (error) {
    console.error("Cloudinary delete failed:", error.message);
  }
};

const URL_PATTERN =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

const assertValidUrl = (value) => {
  if (!URL_PATTERN.test(value.trim())) {
    throw ApiError.badRequest("Invalid URL format");
  }
};

const buildNotePayload = async (userId, payload) => {
  const subjectId = await assertSubjectIfProvided(userId, payload.subjectId);

  return {
    userId,
    subjectId,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    type: CONTENT_TYPE.NOTE,
    content: payload.content.trim(),
    isPinned: Boolean(payload.isPinned),
  };
};

const buildLinkPayload = async (userId, payload) => {
  const subjectId = await assertSubjectIfProvided(userId, payload.subjectId);
  const url = extractLinkUrl(payload);

  return {
    userId,
    subjectId,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    type: CONTENT_TYPE.LINK,
    content: url,
  };
};

export const list = async (userId, query = {}) => {
  const filters = {};

  if (query.subjectId !== undefined) {
    filters.subjectId = normalizeSubjectId(query.subjectId);
    if (filters.subjectId) {
      await assertOwned(userId, filters.subjectId);
    }
  }

  if (query.type) {
    filters.type = query.type;
  }

  const items = await contentRepository.findAllByUserId(userId, filters);
  return serializeContentList(items);
};

export const getById = async (userId, id) => {
  const item = await getOwnedOrThrow(userId, id);
  return serializeContentItem(item);
};

export const listBySubject = async (userId, subjectId) => {
  await assertOwned(userId, subjectId);
  const items = await contentRepository.findBySubjectId(userId, subjectId);
  return serializeContentList(items);
};

export const create = async (userId, payload) => {
  let data;

  if (payload.type === CONTENT_TYPE.NOTE) {
    data = await buildNotePayload(userId, payload);
  } else if (payload.type === CONTENT_TYPE.LINK) {
    data = await buildLinkPayload(userId, payload);
  } else {
    throw ApiError.badRequest("Use POST /content/upload for file content");
  }

  const item = await contentRepository.create(data);
  return serializeContentItem(item);
};

export const createFileContent = async (userId, body, file, uploadResult) => {
  if (!file) {
    throw ApiError.badRequest("File is required");
  }

  const subjectId = await assertSubjectIfProvided(userId, body.subjectId);
  const fileMeta = extractFileMetadata(file, uploadResult);

  const item = await contentRepository.create({
    userId,
    subjectId,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    type: CONTENT_TYPE.FILE,
    ...fileMeta,
  });

  return serializeContentItem(item);
};

export const update = async (
  userId,
  id,
  payload,
  replacementFile = null,
  uploadResult = null,
) => {
  const existing = await getOwnedOrThrow(userId, id);

  if (payload.type && payload.type !== existing.type) {
    throw ApiError.badRequest("Content type cannot be changed");
  }

  const updates = {};

  if (payload.title !== undefined) {
    updates.title = payload.title.trim();
  }

  if (payload.description !== undefined) {
    updates.description = payload.description?.trim() || null;
  }

  if (payload.isPinned !== undefined) {
    updates.isPinned = Boolean(payload.isPinned);
  }

  if (payload.subjectId !== undefined) {
    updates.subjectId = await assertSubjectIfProvided(
      userId,
      payload.subjectId,
    );
  }

  if (existing.type === CONTENT_TYPE.NOTE) {
    if (payload.content !== undefined) {
      if (!payload.content.trim()) {
        throw ApiError.badRequest("Content body is required for notes");
      }
      updates.content = payload.content.trim();
    }
  }

  if (existing.type === CONTENT_TYPE.LINK) {
    if (payload.content !== undefined) {
      if (!payload.content.trim()) {
        throw ApiError.badRequest("URL is required for link content");
      }
      assertValidUrl(payload.content);
      updates.content = payload.content.trim();
    }
  }

  if (existing.type === CONTENT_TYPE.FILE) {
    if (replacementFile) {
      if (!uploadResult) {
        throw ApiError.badRequest("Upload result is required when replacing file");
      }
      await deleteCloudinaryAsset(existing);
      Object.assign(updates, extractFileMetadata(replacementFile, uploadResult));
    }
  } else if (replacementFile) {
    throw ApiError.badRequest("Replacement file is only supported for file content");
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("At least one field is required to update");
  }

  const updated = await contentRepository.updateById(id, userId, updates);
  return serializeContentItem(updated);
};

export const getTextPreview = async (userId, id) => {
  const item = await getOwnedFileOrThrow(userId, id);
  assertTextFileItem(item);
  const text = await fetchTextContent(item);
  return { text };
};

export const getDocPreview = async (userId, id) => {
  const item = await getOwnedFileOrThrow(userId, id);
  return fetchDocPreview(item);
};

export const getExcelPreview = async (userId, id) => {
  const item = await getOwnedFileOrThrow(userId, id);
  return fetchExcelPreview(item);
};

export const remove = async (userId, id) => {
  const item = await getOwnedOrThrow(userId, id);

  if (item.type === CONTENT_TYPE.FILE) {
    await deleteCloudinaryAsset(item);
  }

  await contentRepository.softDeleteById(id, userId);
};

export const getByIdForAdmin = async (id) => {
  const item = await contentRepository.findByIdWithOwner(id);
  if (!item) {
    throw ApiError.notFound("Content not found");
  }
  return item;
};

export const getTextPreviewForAdmin = async (id) => {
  const item = await getExistingFileOrThrow(id);
  assertTextFileItem(item);
  const text = await fetchTextContent(item);
  return { text };
};

export const getDocPreviewForAdmin = async (id) => {
  const item = await getExistingFileOrThrow(id);
  return fetchDocPreview(item);
};

export const getExcelPreviewForAdmin = async (id) => {
  const item = await getExistingFileOrThrow(id);
  return fetchExcelPreview(item);
};
