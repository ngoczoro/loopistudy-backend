import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { Task, Subject } = sequelize.models;
  if (data.subjectId) {
    const subject = await Subject.findOne({ where: { id: data.subjectId, userId } });
    if (!subject) throw new Error("Subject not found or access denied");
  }
  return await Task.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Task } = sequelize.models;
  return await Task.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { Task } = sequelize.models;
  return await Task.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { Task } = sequelize.models;
  const item = await Task.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { Task } = sequelize.models;
  const item = await Task.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
