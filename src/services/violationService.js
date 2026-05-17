import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { Violation } = sequelize.models;
  return await Violation.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Violation } = sequelize.models;
  return await Violation.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { Violation } = sequelize.models;
  return await Violation.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { Violation } = sequelize.models;
  const item = await Violation.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { Violation } = sequelize.models;
  const item = await Violation.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
