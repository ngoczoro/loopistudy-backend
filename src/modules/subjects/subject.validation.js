import Joi from "joi";
import { PRIORITIES, SUBJECT_DIFFICULTIES } from "../../config/enums.js";

const difficultySchema = Joi.string()
  .valid(...SUBJECT_DIFFICULTIES, "easy", "medium", "hard", "Easy", "Medium", "Hard")
  .messages({
    "any.only": "Difficulty must be Easy, Medium, or Hard",
  });

const prioritySchema = Joi.string()
  .valid(...PRIORITIES)
  .messages({
    "any.only": "Priority must be low, medium, or high",
  });

export const createSubjectSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  credits: Joi.number().integer().min(0).max(99).optional(),
  difficulty: difficultySchema.optional(),
  examDate: Joi.date().iso().optional(),
  color: Joi.string().max(30).optional(),
  priority: prioritySchema.optional(),
  requiredHoursPerWeek: Joi.number().min(0).max(168).optional(),
  progress: Joi.number().min(0).max(100).optional(),
});

export const updateSubjectSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  credits: Joi.number().integer().min(0).max(99).optional(),
  difficulty: difficultySchema.optional(),
  examDate: Joi.date().iso().allow(null).optional(),
  color: Joi.string().max(30).optional(),
  priority: prioritySchema.optional(),
  requiredHoursPerWeek: Joi.number().min(0).max(168).allow(null).optional(),
  progress: Joi.number().min(0).max(100).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update a subject",
  });

export const subjectIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
