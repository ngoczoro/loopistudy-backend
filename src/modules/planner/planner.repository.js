import sequelize from "../../config/database.js";

const models = () => sequelize.models;

export const findAllByUserAndWeek = async (userId, weekStartDate) => {
  const { PlannerSession } = models();
  return PlannerSession.findAll({
    where: { userId, weekStartDate },
    order: [
      ["day_of_week", "ASC"],
      ["start_hour", "ASC"],
    ],
  });
};

export const findByIdAndUserId = async (id, userId) => {
  const { PlannerSession } = models();
  return PlannerSession.findOne({ where: { id, userId } });
};

export const create = async (data) => {
  const { PlannerSession } = models();
  return PlannerSession.create(data);
};

export const update = async (session, data) => {
  return session.update(data);
};

export const remove = async (session) => {
  return session.destroy();
};
