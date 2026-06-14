import sequelize from "../../../config/database.js";

const Quiz = () => sequelize.models.Quiz;

export const findExistingAiQuiz = async ({
  userId,
  sourceDocumentId,
  difficulty,
  questionCount,
}) =>
  Quiz().findOne({
    where: {
      userId,
      sourceDocumentId,
      generationDifficulty: difficulty,
      generationQuestionCount: questionCount,
      source: "ai_generated",
    },
    order: [["createdAt", "DESC"]],
  });

export const createAiQuiz = async (data) => Quiz().create(data);

export const findUserQuizTitles = async (userId) => {
  const rows = await Quiz().findAll({
    where: { userId },
    attributes: ["title"],
    raw: true,
  });

  return rows.map((row) => String(row.title ?? "").trim()).filter(Boolean);
};

export const findPreviousQuestionTexts = async ({
  userId,
  sourceDocumentId = null,
  subjectId = null,
  limit = 20,
}) => {
  const where = {
    userId,
    source: "ai_generated",
  };

  if (sourceDocumentId) {
    where.sourceDocumentId = sourceDocumentId;
  } else if (subjectId) {
    where.subjectId = subjectId;
  } else {
    return [];
  }

  const rows = await Quiz().findAll({
    where,
    attributes: ["questions"],
    order: [["createdAt", "DESC"]],
    limit: 15,
  });

  const texts = [];

  for (const row of rows) {
    const questions = Array.isArray(row.questions) ? row.questions : [];

    for (const item of questions) {
      const text = String(item?.question ?? "").trim();
      if (text) {
        texts.push(text);
      }

      if (texts.length >= limit) {
        return texts.slice(0, limit);
      }
    }
  }

  return texts.slice(0, limit);
};
