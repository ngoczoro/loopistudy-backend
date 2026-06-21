import { Op } from "sequelize";
import sequelize from "../../../config/database.js";

const User = () => sequelize.models.User;
const Subject = () => sequelize.models.Subject;
const ContentItem = () => sequelize.models.ContentItem;
const Quiz = () => sequelize.models.Quiz;
const Violation = () => sequelize.models.Violation;

const buildSearchTerm = (query) => `%${String(query ?? "").trim()}%`;

export const searchUsers = async (query, limit = 5) => {
  const term = buildSearchTerm(query);

  return User().findAll({
    where: {
      [Op.or]: [
        { fullName: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
      ],
    },
    limit,
    order: [["createdAt", "DESC"]],
    attributes: {
      exclude: ["passwordHash"],
    },
  });
};

export const searchSubjects = async (query, limit = 5) => {
  const term = buildSearchTerm(query);

  return Subject().findAll({
    where: {
      name: { [Op.iLike]: term },
    },
    limit,
    order: [["created_at", "DESC"]],
    include: [
      {
        model: User(),
        as: "user",
        attributes: ["id", "fullName", "email"],
      },
    ],
  });
};

export const countDocumentsBySubjectIds = async (subjectIds = []) => {
  if (!subjectIds.length) return {};

  const rows = await ContentItem().findAll({
    attributes: [
      "subjectId",
      [sequelize.fn("COUNT", sequelize.col("ContentItem.id")), "documentCount"],
    ],
    where: {
      subjectId: subjectIds,
    },
    group: ["ContentItem.subject_id"],
    raw: true,
  });

  return rows.reduce((acc, row) => {
    if (row.subjectId) {
      acc[row.subjectId] = Number(row.documentCount ?? 0);
    }
    return acc;
  }, {});
};

export const searchDocuments = async (query, limit = 5) => {
  const term = buildSearchTerm(query);

  return ContentItem().findAll({
    where: {
      [Op.or]: [
        { title: { [Op.iLike]: term } },
        { fileName: { [Op.iLike]: term } },
      ],
    },
    limit,
    order: [["created_at", "DESC"]],
    include: [
      {
        model: User(),
        as: "user",
        attributes: ["id", "fullName", "email"],
      },
      {
        model: Subject(),
        as: "subject",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  });
};

export const searchQuizzes = async (query, limit = 5) => {
  const term = buildSearchTerm(query);

  return Quiz().findAll({
    where: {
      title: { [Op.iLike]: term },
    },
    limit,
    order: [["created_at", "DESC"]],
    include: [
      {
        model: User(),
        as: "user",
        attributes: ["id", "fullName", "email"],
      },
      {
        model: Subject(),
        as: "subject",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  });
};

export const searchViolations = async (query, limit = 5) => {
  const trimmed = String(query ?? "").trim();
  const term = buildSearchTerm(trimmed);

  return Violation().findAll({
    where: {
      [Op.or]: [
        { contentTitle: { [Op.iLike]: term } },
        { type: { [Op.iLike]: term } },
        sequelize.where(
          sequelize.cast(sequelize.col("Violation.id"), "TEXT"),
          { [Op.iLike]: term },
        ),
      ],
    },
    limit,
    order: [["detected_at", "DESC"]],
    include: [
      {
        model: User(),
        as: "user",
        attributes: ["id", "fullName", "email"],
      },
    ],
  });
};
