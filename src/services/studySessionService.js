import sequelize from "../config/database.js";

export const create = async (userId, data) => {
  const { StudySession, StudyPlan, Subject } = sequelize.models;
  const plan = await StudyPlan.findOne({ 
    where: { id: data.studyPlanId },
    include: [{ model: Subject, as: 'subject', where: { userId }, required: true }]
  });
  if (!plan) throw new Error("StudyPlan not found or access denied");
  return await StudySession.create({ ...data });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { StudySession, StudyPlan, Subject } = sequelize.models;
  return await StudySession.findAndCountAll({
    where: { ...filters },
    include: [{
      model: StudyPlan,
      as: 'studyPlan',
      required: true,
      attributes: [],
      include: [{ model: Subject, as: 'subject', where: { userId }, required: true, attributes: [] }]
    }],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });
};

export const getById = async (userId, id) => {
  const { StudySession, StudyPlan, Subject } = sequelize.models;
  return await StudySession.findOne({ 
    where: { id },
    include: [{
      model: StudyPlan,
      as: 'studyPlan',
      required: true,
      include: [{ model: Subject, as: 'subject', where: { userId }, required: true }]
    }]
  });
};

export const update = async (userId, id, data) => {
  const { StudySession, StudyPlan, Subject } = sequelize.models;
  const item = await StudySession.findOne({ 
    where: { id },
    include: [{
      model: StudyPlan,
      as: 'studyPlan',
      required: true,
      include: [{ model: Subject, as: 'subject', where: { userId }, required: true }]
    }]
  });
  if (!item) return null;
  return await item.update(data);
};

export const remove = async (userId, id) => {
  const { StudySession, StudyPlan, Subject } = sequelize.models;
  const item = await StudySession.findOne({ 
    where: { id },
    include: [{
      model: StudyPlan,
      as: 'studyPlan',
      required: true,
      include: [{ model: Subject, as: 'subject', where: { userId }, required: true }]
    }]
  });
  if (!item) return false;
  await item.destroy();
  return true;
};
