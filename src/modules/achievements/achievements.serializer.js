export const serializeBadge = (badge, { unlocked = false, earnedAt = null } = {}) => ({
  id: badge.id,
  code: badge.code,
  name: badge.name,
  description: badge.description ?? null,
  unlocked,
  earnedAt: earnedAt ? earnedAt.toISOString() : null,
});

export const serializeBadgeList = (badges) => badges;
