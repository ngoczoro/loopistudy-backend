import Joi from "joi";
import { DAY_LABELS } from "./user.constants.js";

const notificationSchema = Joi.object({
  taskReminders: Joi.boolean().optional(),
  sessionReminders: Joi.boolean().optional(),
  deadlineAlerts: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min":
      "At least one notification setting is required when updating notifications",
  });

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  avatarUrl: Joi.string().max(2048).allow(null, "").optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update your profile",
  });

export const updatePreferencesSchema = Joi.object({
  pomodoroDuration: Joi.number().integer().min(1).max(180).optional(),
  breakDuration: Joi.number().integer().min(1).max(60).optional(),
  maxStudyHoursPerDay: Joi.number().min(1).max(12).optional(),
  notifications: notificationSchema.optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update preferences",
  });

const blockedSlotSchema = Joi.object({
  day: Joi.string()
    .valid(...DAY_LABELS)
    .required()
    .messages({
      "any.only": "Day must be Mon, Tue, Wed, Thu, Fri, Sat, or Sun",
    }),
  hour: Joi.number().integer().min(0).max(23).required(),
});

export const replaceBlockedSlotsSchema = Joi.object({
  slots: Joi.array().items(blockedSlotSchema).required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
    }),
});
