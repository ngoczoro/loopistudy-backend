import sequelize from "../../config/database.js";

const models = () => sequelize.models;

export const findBadgeByCode = async (code) => {
  const { Badge } = models();
  return Badge.findOne({ where: { code } });
};

export const findAllBadges = async () => {
  const { Badge } = models();
  return Badge.findAll({ order: [["code", "ASC"]] });
};

export const findUserBadgeIds = async (userId) => {
  const { UserBadge } = models();
  const rows = await UserBadge.findAll({
    where: { userId },
    attributes: ["badgeId", "earnedAt"],
  });
  return rows;
};

/**
 * Idempotent unlock — PK (user_id, badge_id) prevents duplicates.
 */
export const unlockBadge = async (userId, badgeId) => {
  const { UserBadge } = models();
  const [row, created] = await UserBadge.findOrCreate({
    where: { userId, badgeId },
    defaults: { userId, badgeId, earnedAt: new Date() },
  });
  return { row, created: Boolean(created) };
};

export const hasUserBadge = async (userId, badgeId) => {
  const { UserBadge } = models();
  const count = await UserBadge.count({ where: { userId, badgeId } });
  return count > 0;
};
