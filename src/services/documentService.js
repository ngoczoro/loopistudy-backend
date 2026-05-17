import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { Document, Subject } = sequelize.models;
  if (data.subjectId) {
    const subject = await Subject.findOne({ where: { id: data.subjectId, userId } });
    if (!subject) throw new Error("Subject not found or access denied");
  }
  return await Document.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Document } = sequelize.models;
  return await Document.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { Document } = sequelize.models;
  return await Document.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { Document } = sequelize.models;
  const item = await Document.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { Document } = sequelize.models;
  const item = await Document.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
