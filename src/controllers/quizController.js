import { initializeModels } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

const models = initializeModels();
const { Quiz, QuizQuestion } = models;

export const getQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.findAll({ where: { isPublished: true } });
    res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
};

export const getQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByPk(id, { include: ['questions'] });
    if (!quiz) throw new ApiError(404, "Quiz not found");
    res.json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req, res, next) => {
  try {
    // Admin only logic
    const quiz = await Quiz.create({
      ...req.body,
      createdByAdminId: req.user.userId,
    });
    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};
