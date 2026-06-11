import { Op } from "sequelize";
import sequelize from "../../config/database.js";
import { PLANNER_SESSION_SOURCES } from "../../config/enums.js";

const models = () => sequelize.models;

const AI_PLAN_SOURCE = PLANNER_SESSION_SOURCES.find((s) => s === "ai_plan") ?? "ai_plan";

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

export const findByUserWeekRange = async (userId, fromWeek, toWeek) => {
  const { PlannerSession } = models();
  return PlannerSession.findAll({
    where: {
      userId,
      weekStartDate: {
        [Op.between]: [fromWeek, toWeek],
      },
    },
    order: [
      ["week_start_date", "ASC"],
      ["day_of_week", "ASC"],
      ["start_hour", "ASC"],
    ],
  });
};

export const deleteAiPlanBySubjectIds = async (
  userId,
  subjectIds,
  transaction = null,
) => {
  if (!subjectIds?.length) {
    return 0;
  }

  const { PlannerSession } = models();
  return PlannerSession.destroy({
    where: {
      userId,
      source: AI_PLAN_SOURCE,
      subjectId: { [Op.in]: subjectIds },
    },
    transaction,
  });
};

export const bulkCreate = async (sessions, transaction = null) => {
  const { PlannerSession } = models();
  return PlannerSession.bulkCreate(sessions, { transaction });
};
