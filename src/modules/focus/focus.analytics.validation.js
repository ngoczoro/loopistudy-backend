import Joi from "joi";

export const analyticsDateRangeQuerySchema = Joi.object({
  fromDate: Joi.string().isoDate().optional(),
  toDate: Joi.string().isoDate().optional(),
});

export const analyticsTrendsQuerySchema = Joi.object({
  fromDate: Joi.string().isoDate().optional(),
  toDate: Joi.string().isoDate().optional(),
  days: Joi.number().integer().min(7).max(365).optional(),
});

export const analyticsPlannerQuerySchema = Joi.object({
  weekStartDate: Joi.string().isoDate().optional(),
});

export const focusHistoryQuerySchema = Joi.object({
  status: Joi.string()
    .valid("running", "paused", "completed", "cancelled")
    .optional(),
  subjectId: Joi.string().uuid().optional(),
  fromDate: Joi.string().isoDate().optional(),
  toDate: Joi.string().isoDate().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  groupBy: Joi.string().valid("subject", "status", "date").optional(),
});
