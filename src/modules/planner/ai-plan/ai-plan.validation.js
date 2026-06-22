import Joi from "joi";
import { AI_PLAN_MODES, PLAN_CONSTRAINT_TYPES } from "./ai-plan.constants.js";
import { PRIORITIES, SUBJECT_DIFFICULTIES } from "../../../config/enums.js";

const uuidSchema = Joi.string().uuid();

const weekStartDateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    "string.pattern.base": "weekStartDate must be YYYY-MM-DD (Monday of the week)",
  });

const schedulingOverrideSchema = Joi.object({
  subjectId: uuidSchema.required(),
  difficulty: Joi.string()
    .valid(...SUBJECT_DIFFICULTIES)
    .optional(),
  hoursPerWeek: Joi.number().min(0).max(168).optional(),
  examDate: Joi.date().iso().optional(),
});

const planSessionSchema = Joi.object({
  subjectId: uuidSchema.required(),
  title: Joi.string().min(1).max(200).required(),
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  startHour: Joi.number().min(0).max(24).required(),
  durationHours: Joi.number().min(0.5).max(24).required(),
  weekStartDate: weekStartDateSchema.required(),
  color: Joi.string().max(30).allow(null, "").optional(),
  source: Joi.string().valid("ai_plan").optional(),
}).unknown(true);

const constraintSchema = Joi.object({
  type: Joi.string()
    .valid(...PLAN_CONSTRAINT_TYPES)
    .required(),
})
  .unknown(true)
  .messages({
    "object.unknown": "Unknown constraint field",
  });

export const generateAiPlanSchema = Joi.object({
  mode: Joi.string()
    .valid(...AI_PLAN_MODES)
    .required(),
  subjectIds: Joi.array().items(uuidSchema).min(1).required(),
  documentId: uuidSchema.when("mode", {
    is: "document",
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  examDate: Joi.date().iso().optional(),
  schedulingOverrides: Joi.array().items(schedulingOverrideSchema).optional(),
  constraints: Joi.array().items(constraintSchema).optional(),
  maxStudyHoursPerDay: Joi.number().min(1).max(12).optional(),
});

export const applyAiPlanSchema = Joi.object({
  subjectIds: Joi.array().items(uuidSchema).min(1).required(),
  sessions: Joi.array().items(planSessionSchema).min(1).required(),
});

export const chatAiPlanSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
  mode: Joi.string()
    .valid(...AI_PLAN_MODES)
    .optional(),
  documentId: uuidSchema.optional(),
  subjectIds: Joi.array().items(uuidSchema).min(1).required(),
  schedulingOverrides: Joi.array().items(schedulingOverrideSchema).optional(),
  constraints: Joi.array().items(constraintSchema).optional(),
  maxStudyHoursPerDay: Joi.number().min(1).max(12).optional(),
  planContext: Joi.object({
    weeklySummary: Joi.array().items(Joi.object().unknown(true)).optional(),
    subjects: Joi.array().items(Joi.object().unknown(true)).optional(),
  }).optional(),
});

export const analyzeDocumentSchema = Joi.object({
  documentId: uuidSchema.required(),
});
