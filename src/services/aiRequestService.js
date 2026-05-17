import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { AIRequest, Document } = sequelize.models;
  if (data.documentId) {
    const doc = await Document.findOne({ where: { id: data.documentId, userId } });
    if (!doc) throw new Error("Document not found or access denied");
  }
  return await AIRequest.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { AIRequest } = sequelize.models;
  return await AIRequest.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { AIRequest } = sequelize.models;
  return await AIRequest.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { AIRequest } = sequelize.models;
  const item = await AIRequest.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { AIRequest } = sequelize.models;
  const item = await AIRequest.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
