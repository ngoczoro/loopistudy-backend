import sequelize from "../config/database.js";

const QuizAttempt = () => sequelize.models.QuizAttempt;

export const create = (data) => QuizAttempt().create(data);

export const findByQuizAndUser = (quizId, userId, { limit, offset } = {}) =>
  QuizAttempt().findAll({
    where: { quizId, userId },
    order: [["submittedAt", "DESC"]],
    limit,
    offset,
  });

export const countByQuizAndUser = (quizId, userId) =>
  QuizAttempt().count({ where: { quizId, userId } });

export const findLatestByQuizAndUser = (quizId, userId) =>
  QuizAttempt().findOne({
    where: { quizId, userId },
    order: [["submittedAt", "DESC"]],
  });

export const findByIdAndUser = (id, userId) =>
  QuizAttempt().findOne({ where: { id, userId } });

export const findById = (id) => QuizAttempt().findByPk(id);
