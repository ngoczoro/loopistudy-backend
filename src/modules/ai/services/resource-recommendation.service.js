import ApiError from "../../../utils/ApiError.js";
import { getById as getSubjectById } from "../../subjects/index.js";
import { getOpenAIConfig } from "../ai.constants.js";
import { buildResourceRecommendationPrompt } from "../prompts/resource-recommendation.prompt.js";
import * as resourceRecommendationRepository from "../repositories/resource-recommendation.repository.js";
import {
  getCatalogResourcesByIds,
  getResourceById,
  normalizeResourceQuery,
  rankCatalogFallback,
  selectCatalogCandidates,
} from "../resources/resource-catalog.js";
import {
  serializeRecommendationHistoryDetail,
  serializeRecommendationHistoryList,
  serializeRecommendationResult,
} from "../serializers/resource-recommendation.serializer.js";
import * as aiProviderService from "./ai.provider.service.js";

const MAX_CANDIDATES = 10;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

const resolveLimit = (limit) => {
  const value = Number(limit ?? DEFAULT_LIMIT);
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(value)));
};

const assertSubjectAccess = async (userId, subjectId) => {
  if (!subjectId) return null;
  return getSubjectById(userId, subjectId);
};

const mapAiResources = (aiPayload, limit) => {
  const items = Array.isArray(aiPayload?.resources) ? aiPayload.resources : [];
  const seen = new Set();
  const mapped = [];

  for (const item of items) {
    const resourceId = String(item?.resourceId ?? "").trim();
    if (!resourceId || seen.has(resourceId)) continue;

    const catalogResource = getResourceById(resourceId);
    if (!catalogResource) continue;

    seen.add(resourceId);
    mapped.push({
      resourceId: catalogResource.id,
      title: catalogResource.title,
      type: catalogResource.type,
      provider: catalogResource.provider,
      url: catalogResource.url,
      reason: String(item?.reason ?? "").trim().slice(0, 500),
      topics: catalogResource.topics ?? [],
    });

    if (mapped.length >= limit) break;
  }

  return mapped;
};

const buildLearningPath = (aiPayload, query) => {
  const path = Array.isArray(aiPayload?.learningPath)
    ? aiPayload.learningPath
        .map((step) => String(step ?? "").trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  if (path.length) {
    return path;
  }

  return [
    `Xác định mục tiêu học cho "${query}".`,
    "Đọc tài liệu nền tảng từ nguồn được gợi ý.",
    "Thực hành qua ví dụ hoặc bài tập ngắn.",
  ];
};

const rankWithAi = async ({ query, subjectName, candidates, limit }) => {
  const prompt = buildResourceRecommendationPrompt({
    query,
    subjectName,
    candidates,
    limit,
  });

  const { model } = getOpenAIConfig();
  const aiResult = await aiProviderService.generateJson({
    instructions: prompt.instructions,
    input: prompt.input,
    model,
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  const resources = mapAiResources(aiResult, limit);

  return {
    resources,
    learningPath: buildLearningPath(aiResult, query),
    model,
  };
};

const generateRecommendation = async ({
  userId,
  query,
  subjectId = null,
  limit = DEFAULT_LIMIT,
}) => {
  const normalizedQuery = normalizeResourceQuery(query);
  if (!normalizedQuery || normalizedQuery.length < 2) {
    throw ApiError.badRequest("Query must be at least 2 characters.");
  }

  const subject = await assertSubjectAccess(userId, subjectId);
  const subjectName = subject?.name ?? "";
  const resolvedLimit = resolveLimit(limit);

  const candidates = selectCatalogCandidates(query, MAX_CANDIDATES);

  if (!candidates.length) {
    const emptyResult = serializeRecommendationResult({
      query: String(query).trim(),
      normalizedQuery,
      resources: [],
      learningPath: [],
      fromCache: false,
    });

    const saved = await resourceRecommendationRepository.createRecommendationHistory({
      userId,
      subjectId: subjectId ?? null,
      query: String(query).trim(),
      normalizedQuery,
      resources: [],
      learningPath: [],
      model: null,
      lastViewedAt: new Date(),
    });

    return { ...emptyResult, historyId: saved.id };
  }

  let resources = [];
  let learningPath = [];
  let model = null;

  try {
    const aiRanked = await rankWithAi({
      query: String(query).trim(),
      subjectName,
      candidates,
      limit: resolvedLimit,
    });
    resources = aiRanked.resources;
    learningPath = aiRanked.learningPath;
    model = aiRanked.model;
  } catch {
    resources = rankCatalogFallback(query, resolvedLimit);
    learningPath = buildLearningPath(null, query);
  }

  if (!resources.length) {
    resources = rankCatalogFallback(query, resolvedLimit);
    learningPath = buildLearningPath(null, query);
  }

  const saved = await resourceRecommendationRepository.createRecommendationHistory({
    userId,
    subjectId: subjectId ?? null,
    query: String(query).trim(),
    normalizedQuery,
    resources,
    learningPath,
    model,
    lastViewedAt: new Date(),
  });

  return serializeRecommendationResult({
    query: String(query).trim(),
    normalizedQuery,
    resources,
    learningPath,
    fromCache: false,
    historyId: saved.id,
    model,
  });
};

export const getRecommendations = async (
  userId,
  { q, limit = DEFAULT_LIMIT, subjectId = null } = {},
) => {
  const normalizedQuery = normalizeResourceQuery(q);

  await assertSubjectAccess(userId, subjectId);

  const cached = await resourceRecommendationRepository.findCachedRecommendation({
    userId,
    normalizedQuery,
    subjectId: subjectId ?? null,
  });

  if (cached) {
    await resourceRecommendationRepository.touchLastViewed(cached);

    return serializeRecommendationResult({
      query: cached.query,
      normalizedQuery: cached.normalizedQuery,
      resources: cached.resources ?? [],
      learningPath: cached.learningPath ?? [],
      fromCache: true,
      historyId: cached.id,
      model: cached.model ?? null,
    });
  }

  return generateRecommendation({
    userId,
    query: q,
    subjectId,
    limit,
  });
};

export const regenerateRecommendations = async (
  userId,
  { q, limit = DEFAULT_LIMIT, subjectId = null } = {},
) =>
  generateRecommendation({
    userId,
    query: q,
    subjectId,
    limit,
  });

export const listRecommendationHistory = async (
  userId,
  { limit = 5, subjectId } = {},
) => {
  const histories = await resourceRecommendationRepository.findRecentHistories(
    userId,
    {
      limit: resolveLimit(limit),
      ...(subjectId !== undefined ? { subjectId: subjectId ?? null } : {}),
    },
  );

  return serializeRecommendationHistoryList(histories);
};

export const getRecommendationHistoryById = async (userId, historyId) => {
  const history = await resourceRecommendationRepository.findHistoryByIdAndUser(
    historyId,
    userId,
  );

  if (!history) {
    throw ApiError.notFound("Recommendation history not found");
  }

  await resourceRecommendationRepository.touchLastViewed(history);

  return serializeRecommendationHistoryDetail(history);
};

export const getHistoryDetailAsRecommendation = async (userId, historyId) => {
  const detail = await getRecommendationHistoryById(userId, historyId);
  return detail;
};

/** Ensures catalog URLs are used when hydrating from stored resource IDs only. */
export const hydrateResourcesFromCatalog = (resources = []) => {
  const ids = resources
    .map((item) => item?.resourceId ?? item?.resource_id)
    .filter(Boolean);

  return getCatalogResourcesByIds(ids).map((resource) => ({
    resourceId: resource.id,
    title: resource.title,
    type: resource.type,
    provider: resource.provider,
    url: resource.url,
    reason: "",
    topics: resource.topics ?? [],
  }));
};
