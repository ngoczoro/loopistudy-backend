import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { PomodoroSession, Subject } = sequelize.models;
  if (data.subjectId) {
    const subject = await Subject.findOne({ where: { id: data.subjectId, userId } });
    if (!subject) throw new Error("Subject not found or access denied");
  }
  return await PomodoroSession.create({ ...data, userId });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { PomodoroSession } = sequelize.models;
  return await PomodoroSession.findAndCountAll({
    where: { ...filters, userId },
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { PomodoroSession } = sequelize.models;
  return await PomodoroSession.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { PomodoroSession } = sequelize.models;
  const item = await PomodoroSession.findOne({ where: { id, userId } });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { PomodoroSession } = sequelize.models;
  const item = await PomodoroSession.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};
