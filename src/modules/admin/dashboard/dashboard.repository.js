import sequelize from "../../../config/database.js";
import { ROLES, USER_STATUS } from "../../../config/constants.js";
import { SCHEMA } from "../../../models/shared.js";

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

export const fetchWeeklyActivity = async () => {
  const [rows] = await sequelize.query(
    `
    SELECT
      DATE(fs.completed_at) AS day_date,
      COUNT(*)::int AS sessions,
      COUNT(DISTINCT fs.user_id)::int AS students
    FROM "${SCHEMA}"."focus_sessions" fs
    INNER JOIN "${SCHEMA}"."users" u ON u.id = fs.user_id
    WHERE fs.status = 'completed'
      AND fs.completed_at >= NOW() - INTERVAL '7 days'
      AND u.role = :studentRole
    GROUP BY DATE(fs.completed_at)
    ORDER BY day_date ASC
    `,
    {
      replacements: { studentRole: ROLES.STUDENT },
    },
  );

  return rows;
};

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
