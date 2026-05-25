import sequelize from "../../config/database.js";

const ContentItem = () => sequelize.models.ContentItem;

const DEFAULT_ORDER = [
  [sequelize.col("ContentItem.is_pinned"), "DESC"],
  [sequelize.col("ContentItem.updated_at"), "DESC"],
];
export const findAllByUserId = async (userId, filters = {}) => {
  const where = { userId };

  if (filters.subjectId !== undefined) {
    where.subjectId = filters.subjectId;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  return ContentItem().findAll({
    where,
    order: DEFAULT_ORDER,
  });
};

export const findByIdAndUserId = async (id, userId) =>
  ContentItem().findOne({
    where: { id, userId },
  });

export const findBySubjectId = async (userId, subjectId) =>
  ContentItem().findAll({
    where: { userId, subjectId },
    order: DEFAULT_ORDER,
  });

export const create = async (data) => ContentItem().create(data);

export const updateById = async (id, userId, data) => {
  const item = await findByIdAndUserId(id, userId);
  if (!item) return null;

  await item.update(data);
  return item;
};

export const softDeleteById = async (id, userId) => {
  const item = await findByIdAndUserId(id, userId);
  if (!item) return null;

  await item.destroy();
  return item;
};
