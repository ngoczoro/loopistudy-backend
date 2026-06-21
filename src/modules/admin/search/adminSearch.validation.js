import Joi from "joi";

export const adminSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(100).required(),
});
