import { Op } from "sequelize";
import sequelize from "../../../config/database.js";

const Subject = () => sequelize.models.Subject;
const User = () => sequelize.models.User;

export const buildAdminSubjectWhere = (filters = {}) => {
  const where = {};

  if (filters.search?.trim()) {
    where.name = { [Op.iLike]: `%${filters.search.trim()}%` };
  }

  if (filters.difficulty) {
    where.difficulty = filters.difficulty;
  }

  return where;
};

export const findSubjectsForAdmin = async ({ where, limit, offset }) => {
  const { rows, count } = await Subject().findAndCountAll({
    where,
    limit,
    offset,
    order: [["created_at", "DESC"]],
    include: [
      {
        model: User(),
        as: "user",
        attributes: ["id", "fullName", "email"],
      },
    ],
  });

  return { rows, total: count };
};

export const findSubjectById = async (id) => Subject().findByPk(id);

export const softDeleteSubject = async (subject) => subject.destroy();
