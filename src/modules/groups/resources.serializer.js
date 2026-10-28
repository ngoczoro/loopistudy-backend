import { serializeUserSummary } from "./groups.serializer.js";

const toIso = (value) => (value ? new Date(value).toISOString() : null);

export const serializeResource = (resource) => ({
  id: resource.id,
  groupId: resource.groupId,
  type: resource.type,
  title: resource.title,
  description: resource.description ?? null,
  url: resource.url ?? null,
  refId: resource.refId ?? null,
  ref: resource.refSnapshot ?? null,
  sharedBy: serializeUserSummary(resource.sharer),
  createdAt: toIso(resource.createdAt),
});
