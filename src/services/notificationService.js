import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { Notification } = sequelize.models;
  return await Notification.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Notification } = sequelize.models;
  return await Notification.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { Notification } = sequelize.models;
  return await Notification.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { Notification } = sequelize.models;
  const item = await Notification.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { Notification } = sequelize.models;
  const item = await Notification.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
