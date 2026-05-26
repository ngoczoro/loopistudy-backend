import sequelize from "../../../config/database.js";
import { ROLES, USER_STATUS } from "../../../config/constants.js";

const User = () => sequelize.models.User;
const Subject = () => sequelize.models.Subject;
const ContentItem = () => sequelize.models.ContentItem;

const studentWhere = { role: ROLES.STUDENT };

export const countTotalStudents = async () =>
  User().count({ where: studentWhere });

export const countActiveStudents = async () =>
  User().count({
    where: { ...studentWhere, status: USER_STATUS.ACTIVE },
  });

export const countLockedStudents = async () =>
  User().count({
    where: { ...studentWhere, status: USER_STATUS.LOCKED },
  });

export const countTotalSubjects = async () => Subject().count();

export const fetchRecentContent = async (limit = 10) =>
  ContentItem().findAll({
    limit,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: User(),
        as: "user",
        attributes: ["id", "fullName", "email"],
      },
    ],
  });
