export const serializeSavedLearningResource = (resource) => {
  if (!resource) return null;

  const plain = resource.get ? resource.get({ plain: true }) : resource;

  return {
    id: plain.id,
    userId: plain.userId ?? plain.user_id ?? null,
    subjectId: plain.subjectId ?? plain.subject_id ?? null,
    resourceId: plain.resourceId ?? plain.resource_id,
    title: plain.title,
    type: plain.type,
    provider: plain.provider,
    url: plain.url,
    reason: plain.reason ?? null,
    topics: Array.isArray(plain.topics) ? plain.topics : [],
    sourceQuery: plain.sourceQuery ?? plain.source_query ?? null,
    createdAt: plain.createdAt ?? plain.created_at ?? null,
    updatedAt: plain.updatedAt ?? plain.updated_at ?? null,
  };
};

export const serializeSavedLearningResourceList = (resources) =>
  (resources ?? []).map(serializeSavedLearningResource).filter(Boolean);
