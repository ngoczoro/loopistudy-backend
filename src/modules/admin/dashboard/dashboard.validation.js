import Joi from "joi";

export const recentContentQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional(),
});
