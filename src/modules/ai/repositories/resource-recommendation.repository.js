import sequelize from "../../../config/database.js";

const History = () => sequelize.models.AiResourceRecommendationHistory;

export const findCachedRecommendation = async ({
  userId,
  normalizedQuery,
  subjectId = null,
}) =>
  History().findOne({
    where: {
      userId,
      normalizedQuery,
      subjectId: subjectId ?? null,
    },
    order: [["createdAt", "DESC"]],
  });

export const createRecommendationHistory = async (data) =>
  History().create(data);

export const touchLastViewed = async (record) => {
  if (!record) return null;
  return record.update({ lastViewedAt: new Date() });
};

export const findRecentHistories = async (userId, { limit = 5, subjectId } = {}) => {
  const where = { userId };

  if (subjectId !== undefined) {
    where.subjectId = subjectId ?? null;
  }

  return History().findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
  });
};

export const findHistoryByIdAndUser = async (id, userId) =>
  History().findOne({
    where: { id, userId },
  });
