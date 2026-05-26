import Joi from "joi";

const uuid = Joi.string().uuid();

const resolvedFilterValues = ["pending", "resolved", "all"];

const riskLevelValues = ["low", "medium", "high"];

export const adminViolationIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const adminViolationStatsQuerySchema = Joi.object({
  search: Joi.string().trim().max(200).allow("").optional(),
});

export const adminListViolationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(200).allow("").optional(),
  resolved: Joi.string()
    .valid(...resolvedFilterValues)
    .optional()
    .default("all"),
  riskLevel: Joi.string()
    .valid(...riskLevelValues)
    .optional(),
});
