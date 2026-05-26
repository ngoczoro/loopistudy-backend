import Joi from "joi";
import { SUBJECT_DIFFICULTY } from "../../../config/constants.js";

const uuid = Joi.string().uuid();

const difficultyValues = [
  SUBJECT_DIFFICULTY.EASY,
  SUBJECT_DIFFICULTY.MEDIUM,
  SUBJECT_DIFFICULTY.HARD,
];

export const adminSubjectIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const adminListSubjectsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(200).allow("").optional(),
  difficulty: Joi.string()
    .valid(...difficultyValues)
    .optional(),
});
