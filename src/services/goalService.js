/**
 * @deprecated Use modules/goals/goals.repository.js
 */
import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { StudyGoal } = sequelize.models;
  return await StudyGoal.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { StudyGoal } = sequelize.models;
  return await StudyGoal.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { StudyGoal } = sequelize.models;
  return await StudyGoal.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { StudyGoal } = sequelize.models;
  const item = await StudyGoal.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { StudyGoal } = sequelize.models;
  const item = await StudyGoal.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
