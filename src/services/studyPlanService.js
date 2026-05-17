import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { StudyPlan, Subject } = sequelize.models;
  const subject = await Subject.findOne({ where: { id: data.subjectId, userId } });
  if (!subject) throw new Error("Subject not found or access denied");
  return await StudyPlan.create({ ...data });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { StudyPlan, Subject } = sequelize.models;
  return await StudyPlan.findAndCountAll({
    where: { ...filters },
    include: [{
      model: Subject,
      as: 'subject',
      where: { userId },
      attributes: [] // Just for filtering
    }],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { StudyPlan, Subject } = sequelize.models;
  return await StudyPlan.findOne({ 
    where: { id },
    include: [{ model: Subject, as: 'subject', where: { userId } }]
  });
};

export const update = async (userId, id, data) => {
  const { StudyPlan, Subject } = sequelize.models;
  const item = await StudyPlan.findOne({ 
    where: { id },
    include: [{ model: Subject, as: 'subject', where: { userId } }]
  });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { StudyPlan, Subject } = sequelize.models;
  const item = await StudyPlan.findOne({ 
    where: { id },
    include: [{ model: Subject, as: 'subject', where: { userId } }]
  });
  if (!item) return false;
  await item.destroy();
  return true;
};
