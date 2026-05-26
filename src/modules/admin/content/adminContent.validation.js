import Joi from "joi";

export const adminContentIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
