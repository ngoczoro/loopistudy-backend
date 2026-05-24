import sequelize from "../../config/database.js";

const models = () => sequelize.models;

export const findAllByUserId = async (userId) => {
  const { Subject } = models();
  return Subject.findAll({
    where: { userId },
    order: [["created_at", "DESC"]],
  });
};

export const findByIdAndUserId = async (id, userId) => {
  const { Subject } = models();
  return Subject.findOne({ where: { id, userId } });
};

export const findByNameAndUserId = async (name, userId, excludeId = null) => {
  const { Subject } = models();
  const { Op } = sequelize.Sequelize;

  const where = {
    userId,
    name: { [Op.iLike]: name },
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  return Subject.findOne({ where });
};

export const countByUserId = async (userId) => {
  const { Subject } = models();
  return Subject.count({ where: { userId } });
};

export const create = async (data) => {
  const { Subject } = models();
  return Subject.create(data);
};

export const update = async (subject, data) => {
  return subject.update(data);
};

export const softDelete = async (subject) => {
  return subject.destroy();
};
