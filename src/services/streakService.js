import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { Streak } = sequelize.models;
  return await Streak.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Streak } = sequelize.models;
  return await Streak.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { Streak } = sequelize.models;
  return await Streak.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { Streak } = sequelize.models;
  const item = await Streak.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { Streak } = sequelize.models;
  const item = await Streak.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
