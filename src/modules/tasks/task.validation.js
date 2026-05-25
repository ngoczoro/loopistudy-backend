import Joi from "joi";
import { PRIORITY } from "../../config/constants.js";
import { PAGINATION } from "../../config/constants.js";
import { TASK_SORT_FIELDS, TASK_STATUSES } from "./task.constants.js";

const uuid = Joi.string().uuid();

const nullableSubjectId = Joi.alternatives().try(
  uuid,
  Joi.valid(null, ""),
).optional();

const isoDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    "string.pattern.base": "Date must be in YYYY-MM-DD format",
  });

const prioritySchema = Joi.string()
  .valid(PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH)
  .messages({
    "any.only": "Priority must be low, medium, or high",
  });

export const taskIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title is required",
  }),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  priority: prioritySchema.default(PRIORITY.MEDIUM),
  dueDate: isoDate.required().messages({
    "any.required": "Due date is required",
  }),
  subjectId: nullableSubjectId,
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  priority: prioritySchema.optional(),
  dueDate: isoDate.optional(),
  subjectId: nullableSubjectId,
  completed: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const completeTaskSchema = Joi.object({
  completed: Joi.boolean().required().messages({
    "any.required": "completed is required",
  }),
});

export const listQuerySchema = Joi.object({
  subjectId: nullableSubjectId,
  priority: prioritySchema.optional(),
  status: Joi.string()
    .valid(...TASK_STATUSES)
    .optional(),
  completed: Joi.boolean().optional(),
  dueDate: isoDate.optional(),
  dueDateFrom: isoDate.optional(),
  dueDateTo: isoDate.optional(),
  sort: Joi.string()
    .pattern(
      new RegExp(
        `^(${TASK_SORT_FIELDS.join("|")}):(asc|desc)$`,
        "i",
      ),
    )
    .optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .optional(),
});

export const summaryQuerySchema = Joi.object({
  upcomingLimit: Joi.number().integer().min(1).max(50).optional(),
  overdueLimit: Joi.number().integer().min(1).max(50).optional(),
});
