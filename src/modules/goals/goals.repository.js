import sequelize from "../../config/database.js";

const StudyGoal = () => sequelize.models.StudyGoal;

export const findAllActiveByUser = async (userId, { includeInactive = false } = {}) => {
  const where = { userId };
  if (!includeInactive) {
    where.active = true;
  }

  return StudyGoal().findAll({
    where,
    order: [["createdAt", "DESC"]],
  });
};

export const findByIdAndUser = async (id, userId) =>
  StudyGoal().findOne({ where: { id, userId } });

export const create = async (data) => StudyGoal().create(data);

export const update = async (goal, data) => goal.update(data);

export const remove = async (goal) => goal.destroy();
