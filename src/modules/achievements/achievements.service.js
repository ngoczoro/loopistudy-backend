import * as achievementsRepository from "./achievements.repository.js";
import { serializeBadge, serializeBadgeList } from "./achievements.serializer.js";

export const listBadgesForUser = async (userId) => {
  const [badges, userBadges] = await Promise.all([
    achievementsRepository.findAllBadges(),
    achievementsRepository.findUserBadgeIds(userId),
  ]);

  const earnedByBadgeId = new Map(
    userBadges.map((row) => [row.badgeId, row.earnedAt]),
  );

  const items = badges.map((badge) =>
    serializeBadge(badge, {
      unlocked: earnedByBadgeId.has(badge.id),
      earnedAt: earnedByBadgeId.get(badge.id) ?? null,
    }),
  );

  return serializeBadgeList(items);
};
