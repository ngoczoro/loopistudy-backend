import sequelize from "../config/database.js";

const ALLOWED_LIST_FILTERS = new Set(["subjectId", "source"]);

const pickListFilters = (filters = {}) => {
  const where = {};

  for (const [key, value] of Object.entries(filters)) {
    if (ALLOWED_LIST_FILTERS.has(key) && value !== undefined && value !== "") {
      where[key] = value;
    }
  }

  return where;
};

export const create = async (userId, data) => {
  const { Quiz } = sequelize.models;
  const { documentId: _documentId, ...payload } = data ?? {};

  return Quiz.create({
    ...payload,
    userId,
    source: payload.source ?? "manual",
  });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Quiz, Subject, ContentItem } = sequelize.models;

  return Quiz.findAndCountAll({
    where: { userId, ...pickListFilters(filters) },
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: ContentItem,
        as: "sourceDocument",
        attributes: ["id", "title"],
        required: false,
      },
    ],
  });
};

export const getById = async (userId, id) => {
  const { Quiz, Subject, ContentItem } = sequelize.models;

  return Quiz.findOne({
    where: { id, userId },
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: ContentItem,
        as: "sourceDocument",
        attributes: ["id", "title"],
        required: false,
      },
    ],
  });
};

export const update = async (userId, id, data) => {
  const { Quiz } = sequelize.models;
  const item = await Quiz.findOne({ where: { id, userId } });

  if (!item) return null;

  return item.update(data);
};

export const remove = async (userId, id) => {
  const { Quiz } = sequelize.models;
  const item = await Quiz.findOne({ where: { id, userId } });

  if (!item) return false;

  await item.destroy();
  return true;
};
