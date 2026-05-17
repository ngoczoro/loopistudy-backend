import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { Subject } = sequelize.models;
  return await Subject.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Subject } = sequelize.models;
  return await Subject.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { Subject } = sequelize.models;
  return await Subject.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { Subject } = sequelize.models;
  const item = await Subject.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { Subject } = sequelize.models;
  const item = await Subject.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
