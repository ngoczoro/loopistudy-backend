export const serializeRecommendedResource = (resource) => ({
  resourceId: resource.resourceId,
  title: resource.title,
  type: resource.type,
  provider: resource.provider,
  url: resource.url,
  reason: resource.reason ?? "",
  topics: Array.isArray(resource.topics) ? resource.topics : [],
});

export const serializeRecommendationResult = ({
  query,
  normalizedQuery,
  resources = [],
  learningPath = [],
  fromCache = false,
  historyId = null,
  model = null,
} = {}) => ({
  query,
  normalizedQuery,
  fromCache,
  historyId,
  model,
  resources: resources.map(serializeRecommendedResource),
  learningPath: Array.isArray(learningPath) ? learningPath : [],
});

export const serializeRecommendationHistorySummary = (history) => {
  if (!history) return null;

  const plain = history.get ? history.get({ plain: true }) : history;

  return {
    id: plain.id,
    query: plain.query,
    normalizedQuery: plain.normalizedQuery ?? plain.normalized_query,
    subjectId: plain.subjectId ?? plain.subject_id ?? null,
    resourceCount: Array.isArray(plain.resources) ? plain.resources.length : 0,
    createdAt: plain.createdAt ?? plain.created_at ?? null,
    lastViewedAt: plain.lastViewedAt ?? plain.last_viewed_at ?? null,
  };
};

export const serializeRecommendationHistoryDetail = (history) => {
  if (!history) return null;

  const plain = history.get ? history.get({ plain: true }) : history;

  return serializeRecommendationResult({
    query: plain.query,
    normalizedQuery: plain.normalizedQuery ?? plain.normalized_query,
    resources: plain.resources ?? [],
    learningPath: plain.learningPath ?? plain.learning_path ?? [],
    fromCache: true,
    historyId: plain.id,
    model: plain.model ?? null,
  });
};

export const serializeRecommendationHistoryList = (histories) =>
  (histories ?? [])
    .map(serializeRecommendationHistorySummary)
    .filter(Boolean);
