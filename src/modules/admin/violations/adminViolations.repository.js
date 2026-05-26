import { Op } from "sequelize";
import sequelize from "../../../config/database.js";

const Violation = () => sequelize.models.Violation;
const User = () => sequelize.models.User;

const buildResolvedWhere = (resolvedFilter) => {
  if (resolvedFilter === "pending") {
    return { resolved: false };
  }
  if (resolvedFilter === "resolved") {
    return { resolved: true };
  }
  return {};
};

const buildUserSearchWhere = (search) => {
  if (!search?.trim()) {
    return null;
  }

  const term = `%${search.trim()}%`;
  return {
    [Op.or]: [
      { fullName: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
    ],
  };
};

export const findViolationsForAdmin = async (filters = {}) => {
  const where = buildResolvedWhere(filters.resolved ?? "all");
  const userWhere = buildUserSearchWhere(filters.search);

  return Violation().findAll({
    where,
    order: [["detected_at", "DESC"]],
    include: [
      {
        model: User(),
        as: "user",
        attributes: [
          "id",
          "fullName",
          "email",
          "status",
          "lockedAt",
          "lockedReason",
        ],
        where: userWhere ?? undefined,
        required: Boolean(userWhere),
      },
    ],
  });
};

export const findById = async (id) =>
  Violation().findByPk(id, {
    include: [
      {
        model: User(),
        as: "user",
        attributes: [
          "id",
          "fullName",
          "email",
          "status",
          "lockedAt",
          "lockedReason",
        ],
      },
    ],
  });

export const markResolved = async (violation, adminUserId) =>
  violation.update({
    resolved: true,
    resolvedBy: adminUserId,
    resolvedAt: new Date(),
  });
