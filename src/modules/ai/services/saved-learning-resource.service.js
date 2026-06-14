import ApiError from "../../../utils/ApiError.js";
import { getById as getSubjectById } from "../../subjects/index.js";
import * as savedLearningResourceRepository from "../repositories/saved-learning-resource.repository.js";
import { getResourceById } from "../resources/resource-catalog.js";
import {
  serializeSavedLearningResource,
  serializeSavedLearningResourceList,
} from "../serializers/saved-learning-resource.serializer.js";

const assertSubjectAccess = async (userId, subjectId) => {
  if (!subjectId) return null;
  return getSubjectById(userId, subjectId);
};

const normalizeOptionalSubjectId = (subjectId) => {
  if (subjectId == null || subjectId === "") {
    return null;
  }

  if (typeof subjectId === "object") {
    return null;
  }

  const value = String(subjectId).trim();
  return value || null;
};

const resolveResourcePayload = (payload) => {
  const catalogResource = payload.resourceId
    ? getResourceById(payload.resourceId)
    : null;

  const url = String(catalogResource?.url ?? payload.url ?? "").trim();
  const title = String(
    catalogResource?.title ?? payload.title ?? "",
  ).trim();
  const type = String(catalogResource?.type ?? payload.type ?? "").trim();
  const provider = String(
    catalogResource?.provider ?? payload.provider ?? "",
  ).trim();
  const resourceId = String(
    catalogResource?.id ?? payload.resourceId ?? "",
  ).trim();

  if (!url || !title || !type || !provider || !resourceId) {
    throw ApiError.badRequest("Invalid learning resource payload.");
  }

  return {
    resourceId,
    title: title.slice(0, 255),
    type: type.slice(0, 50),
    provider: provider.slice(0, 120),
    url,
    reason: payload.reason ? String(payload.reason).trim().slice(0, 500) : null,
    topics: Array.isArray(payload.topics)
      ? payload.topics.map((topic) => String(topic).trim()).filter(Boolean).slice(0, 20)
      : catalogResource?.topics ?? [],
    sourceQuery: payload.sourceQuery
      ? String(payload.sourceQuery).trim().slice(0, 100)
      : null,
  };
};

export const saveLearningResource = async (userId, payload = {}) => {
  const subjectId = normalizeOptionalSubjectId(payload.subjectId);
  await assertSubjectAccess(userId, subjectId);

  const resolved = resolveResourcePayload(payload);
  const existing = await savedLearningResourceRepository.findByUserAndUrl(
    userId,
    resolved.url,
  );

  if (existing) {
    return serializeSavedLearningResource(existing);
  }

  const saved = await savedLearningResourceRepository.createSavedResource({
    userId,
    subjectId,
    ...resolved,
  });

  return serializeSavedLearningResource(saved);
};

export const listSavedLearningResources = async (
  userId,
  { subjectId } = {},
) => {
  const normalizedSubjectId = normalizeOptionalSubjectId(subjectId);

  if (normalizedSubjectId) {
    await assertSubjectAccess(userId, normalizedSubjectId);
  }

  const rows = await savedLearningResourceRepository.findSavedResources(userId, {
    subjectId: normalizedSubjectId ?? undefined,
  });

  return serializeSavedLearningResourceList(rows);
};

export const deleteSavedLearningResource = async (userId, resourceId) => {
  const record = await savedLearningResourceRepository.findSavedResourceByIdAndUser(
    resourceId,
    userId,
  );

  if (!record) {
    throw ApiError.notFound("Saved learning resource not found");
  }

  await savedLearningResourceRepository.deleteSavedResource(record);
};

export const getSavedUrlsForUser = async (userId) =>
  savedLearningResourceRepository.findSavedUrlsForUser(userId);
