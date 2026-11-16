import sequelize from "../config/database.js";
import ApiError from "../utils/ApiError.js";

const ALLOWED_LIST_FILTERS = new Set(["subjectId", "source"]);

const pickListFilters = (filters = {}) => {
  const where = {};

  for (const [key, value] of Object.entries(filters)) {
    if (ALLOWED_LIST_FILTERS.has(key) && value !== undefined && value !== "") {
      where[key] = value;
    }
  }

  return where;
};

const LETTERS = ["A", "B", "C", "D"];

// Keep the stored letter in sync with correctIndex; older readers use either.
const withAnswerLetters = (questions) =>
  questions.map((question) => ({
    ...question,
    correctAnswer: LETTERS[question.correctIndex],
  }));

export const EDITED_AI_QUIZ_DESCRIPTION =
  "Generated from your notes, then edited by you.";

export const create = async (userId, data) => {
  const { Quiz, Subject } = sequelize.models;
  const { title, description = null, subjectId = null, questions } = data;

  if (subjectId) {
    const subject = await Subject.findOne({ where: { id: subjectId, userId } });
    if (!subject) throw ApiError.notFound("Subject not found");
  }

  return Quiz.create({
    userId,
    subjectId,
    title,
    description,
    questions: withAnswerLetters(questions),
    source: "manual",
  });
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Quiz, Subject, ContentItem } = sequelize.models;

  return Quiz.findAndCountAll({
    where: { userId, ...pickListFilters(filters) },
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: ContentItem,
        as: "sourceDocument",
        attributes: ["id", "title"],
        required: false,
      },
    ],
  });
};

export const getById = async (userId, id) => {
  const { Quiz, Subject, ContentItem } = sequelize.models;

  return Quiz.findOne({
    where: { id, userId },
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: ContentItem,
        as: "sourceDocument",
        attributes: ["id", "title"],
        required: false,
      },
    ],
  });
};

export const update = async (userId, id, data) => {
  const { Quiz } = sequelize.models;
  const item = await Quiz.findOne({ where: { id, userId } });

  if (!item) return null;

  const changes = {};
  if (data.title !== undefined) changes.title = data.title;
  if (data.questions !== undefined) {
    changes.questions = withAnswerLetters(data.questions);
    // The generated description promises every answer comes from the notes; edits break that.
    if (item.source === "ai_generated") {
      changes.description = EDITED_AI_QUIZ_DESCRIPTION;
    }
  }

  return item.update(changes);
};

export const remove = async (userId, id) => {
  const { Quiz } = sequelize.models;
  const item = await Quiz.findOne({ where: { id, userId } });

  if (!item) return false;

  await item.destroy();
  return true;
};
