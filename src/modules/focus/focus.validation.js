import Joi from "joi";

const nullableUuid = Joi.alternatives().try(
  Joi.string().uuid(),
  Joi.valid(null, ""),
);

export const createFocusSessionSchema = Joi.object({
  subjectId: nullableUuid.optional(),
  plannerSessionId: Joi.string().uuid().optional().allow(null),
  plannedWorkMinutes: Joi.number().integer().min(1).max(180).required(),
  plannedBreakMinutes: Joi.number().integer().min(1).max(60).optional().allow(null),
  notes: Joi.string().max(2000).allow("", null).optional(),
});

export const focusSessionIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const pauseFocusSessionSchema = Joi.object({
  remainingSeconds: Joi.number().integer().min(0).max(10800).required(),
  workElapsedSeconds: Joi.number().integer().min(0).max(10800).required(),
  currentPhase: Joi.string().valid("work", "break").optional(),
});

export const syncFocusSessionSchema = Joi.object({
  remainingSeconds: Joi.number().integer().min(0).max(10800).required(),
  workElapsedSeconds: Joi.number().integer().min(0).max(10800).required(),
  currentPhase: Joi.string().valid("work", "break").optional(),
});

export const completeFocusSessionSchema = Joi.object({
  actualWorkMinutes: Joi.number().integer().min(0).max(180).optional(),
  workElapsedSeconds: Joi.number().integer().min(0).max(10800).optional(),
});

export const abandonFocusSessionSchema = Joi.object({
  actualWorkMinutes: Joi.number().integer().min(0).max(180).optional(),
  workElapsedSeconds: Joi.number().integer().min(0).max(10800).optional(),
});
