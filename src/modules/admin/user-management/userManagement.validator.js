import Joi from "joi";
import {
  ADMIN_USER_STATUS_FILTER,
  LOCK_REASON_MAX_LENGTH,
} from "../shared/admin.constants.js";

const uuid = Joi.string().uuid();

export const adminUserIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const adminListUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(200).allow("").optional(),
  status: Joi.string()
    .valid(...ADMIN_USER_STATUS_FILTER)
    .optional(),
  role: Joi.string().valid("student", "admin").optional(),
});

export const lockUserSchema = Joi.object({
  reason: Joi.string().trim().max(LOCK_REASON_MAX_LENGTH).allow("", null).optional(),
});
