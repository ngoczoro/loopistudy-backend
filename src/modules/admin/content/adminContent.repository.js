import { Op } from "sequelize";
import sequelize from "../../../config/database.js";

const ContentItem = () => sequelize.models.ContentItem;
const User = () => sequelize.models.User;

export const buildAdminContentWhere = (filters = {}) => {
  const where = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.search?.trim()) {
    where.title = { [Op.iLike]: `%${filters.search.trim()}%` };
  }

  return where;
};

export const findAllForAdmin = async ({ where, limit, offset }) => {
  const { rows, count } = await ContentItem().findAndCountAll({
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
