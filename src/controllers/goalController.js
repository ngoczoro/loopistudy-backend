import { initializeModels } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

const models = initializeModels();
const { Goal } = models;

export const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.findAll({ where: { userId: req.user.userId } });
    res.json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
};

export const createGoal = async (req, res, next) => {
  try {
    const goal = await Goal.create({
      ...req.body,
      userId: req.user.userId,
    });
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};
