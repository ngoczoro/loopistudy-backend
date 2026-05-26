import Joi from "joi";
import {
  GOAL_METRIC_KEYS,
  GOAL_PERIODS,
  GOAL_UNITS,
} from "../../config/enums.js";

const uuid = Joi.string().uuid();

export const goalIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const listGoalsQuerySchema = Joi.object({
  includeInactive: Joi.boolean().optional(),
});

const goalFields = {
  title: Joi.string().trim().min(1).max(200),
  targetValue: Joi.number().positive().required(),
  unit: Joi.string()
    .valid(...GOAL_UNITS)
    .required(),
  period: Joi.string()
    .valid(...GOAL_PERIODS)
    .required(),
  metricKey: Joi.string()
    .valid(...GOAL_METRIC_KEYS)
    .optional(),
  timezone: Joi.string().max(64).optional(),
  active: Joi.boolean().optional(),
  currentValue: Joi.number().min(0).optional(),
};

export const createGoalSchema = Joi.object({
  ...goalFields,
  currentValue: Joi.number().min(0).optional(),
});

export const updateGoalSchema = Joi.object({
  title: goalFields.title.optional(),
  targetValue: Joi.number().positive().optional(),
  unit: goalFields.unit.optional(),
  period: goalFields.period.optional(),
  metricKey: goalFields.metricKey,
  timezone: goalFields.timezone,
  active: goalFields.active,
  currentValue: Joi.number().min(0).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });
