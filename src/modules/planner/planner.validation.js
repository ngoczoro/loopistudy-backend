import Joi from "joi";
import { PLANNER_SESSION_SOURCES } from "../../config/enums.js";

const weekStartDatePattern = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    "string.pattern.base": "weekStartDate must be YYYY-MM-DD (Monday of the week)",
  });

const weekStartDateSchema = weekStartDatePattern.required();

const subjectIdSchema = Joi.string().uuid().allow(null).empty("").optional();

const sessionFields = {
  title: Joi.string().min(1).max(200).required(),
  subjectId: subjectIdSchema,
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  startHour: Joi.number().min(0).max(24).required(),
  durationHours: Joi.number().min(0.5).max(24).required(),
  color: Joi.string().max(30).allow(null, "").optional(),
  weekStartDate: weekStartDateSchema,
  source: Joi.string()
    .valid(...PLANNER_SESSION_SOURCES)
    .optional(),
};

export const listPlannerSessionsQuerySchema = Joi.object({
  weekStartDate: weekStartDateSchema,
});

export const createPlannerSessionSchema = Joi.object({
  ...sessionFields,
});

export const updatePlannerSessionSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  subjectId: subjectIdSchema,
  dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
  startHour: Joi.number().min(0).max(24).optional(),
  durationHours: Joi.number().min(0.5).max(24).optional(),
  color: Joi.string().max(30).allow(null, "").optional(),
  weekStartDate: weekStartDatePattern.optional(),
  source: Joi.string()
    .valid(...PLANNER_SESSION_SOURCES)
    .optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update a session",
  });

export const plannerSessionIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
