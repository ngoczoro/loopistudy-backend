import sequelize from "../../config/database.js";

const models = () => sequelize.models;

const UNFINISHED_STATUSES = ["running", "paused"];

const subjectIdWhere = (subjectId) => {
  const { Op } = sequelize.Sequelize;
  if (subjectId === null || subjectId === undefined) {
    return { [Op.is]: null };
  }
  return subjectId;
};

export const findByIdAndUserId = async (id, userId) => {
  const { FocusSession } = models();
  return FocusSession.findOne({ where: { id, userId } });
};

export const findActiveWithSubject = async (userId) => {
  const { FocusSession, Subject } = models();
  const { Op } = sequelize.Sequelize;

  return FocusSession.findOne({
    where: {
      userId,
      status: { [Op.in]: UNFINISHED_STATUSES },
    },
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
      },
    ],
    order: [["updated_at", "DESC"]],
  });
};

/**
 * @deprecated Legacy single-unfinished assumption. Use findUnfinishedByUserId,
 * findUnfinishedByUserAndSubject, or findRunningByUserId. Kept for existing service shims.
 */
export const findActiveByUserId = async (userId) => {
  const { FocusSession } = models();
  const { Op } = sequelize.Sequelize;

  return FocusSession.findOne({
    where: {
      userId,
      status: { [Op.in]: UNFINISHED_STATUSES },
    },
  });
};

export const findUnfinishedByUserId = async (userId) => {
  const { FocusSession } = models();
  const { Op } = sequelize.Sequelize;

  return FocusSession.findAll({
    where: {
      userId,
      status: { [Op.in]: UNFINISHED_STATUSES },
    },
    order: [["updatedAt", "DESC"]],
  });
};

export const findUnfinishedWithSubject = async (userId) => {
  const { FocusSession, Subject } = models();
  const { Op } = sequelize.Sequelize;

  return FocusSession.findAll({
    where: {
      userId,
      status: { [Op.in]: UNFINISHED_STATUSES },
    },
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
      },
    ],
    order: [["updatedAt", "DESC"]],
  });
};

export const findUnfinishedByUserAndSubject = async (userId, subjectId) => {
  const { FocusSession } = models();
  const { Op } = sequelize.Sequelize;

  return FocusSession.findOne({
    where: {
      userId,
      subjectId: subjectIdWhere(subjectId),
      status: { [Op.in]: UNFINISHED_STATUSES },
    },
  });
};

export const findRunningByUserId = async (userId) => {
  const { FocusSession } = models();

  return FocusSession.findOne({
    where: {
      userId,
      status: "running",
    },
  });
};

export const create = async (data) => {
  const { FocusSession } = models();
  return FocusSession.create(data);
};

export const update = async (session, data) => {
  return session.update(data);
};

export const findHistoryByUserId = async (userId, limit = 50) => {
  const { FocusSession, Subject } = models();

  return FocusSession.findAll({
    where: { userId },
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
      },
    ],
    order: [["startedAt", "DESC"]],
    limit,
  });
};
