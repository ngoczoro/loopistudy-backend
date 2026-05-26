import Joi from "joi";
import { CONTENT_TYPE } from "../../../config/constants.js";

export const adminContentIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const adminListContentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(200).allow("").optional(),
  type: Joi.string()
    .valid(CONTENT_TYPE.NOTE, CONTENT_TYPE.FILE, CONTENT_TYPE.LINK)
    .optional(),
});
