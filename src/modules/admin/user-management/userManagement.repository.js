import { Op } from "sequelize";
import sequelize from "../../../config/database.js";
import { ROLES, USER_STATUS } from "../../../config/constants.js";
import { ADMIN_LIST_DEFAULT_ROLE } from "../shared/admin.constants.js";

const User = () => sequelize.models.User;

const studentRoleWhere = {
  role: ROLES.STUDENT,
};

export const buildAdminUserWhere = (filters = {}) => {
  const where = {
    role: filters.role || ADMIN_LIST_DEFAULT_ROLE,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    where[Op.or] = [
      { fullName: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
    ];
  }

  return where;
};

export const findUsers = async ({ where, limit, offset }) => {
  const { rows, count } = await User().findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    attributes: {
      exclude: ["passwordHash"],
    },
  });

  return { rows, total: count };
};

export const findUserById = async (id) => {
  return User().findByPk(id, {
    attributes: {
      exclude: ["passwordHash"],
    },
  });
};

export const findStudentById = async (id) => {
  return User().findOne({
    where: {
      id,
      ...studentRoleWhere,
    },
    attributes: {
      exclude: ["passwordHash"],
    },
  });
};

export const lockUserRecord = async (user, { lockedAt, lockedReason }) => {
  return user.update({
    status: USER_STATUS.LOCKED,
    lockedAt,
    lockedReason,
  });
};
export const unlockUserRecord = async (user) => {
  return user.update({
    status: USER_STATUS.ACTIVE,
    lockedAt: null,
    lockedReason: null,
  });
};
