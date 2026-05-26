import Joi from "joi";
import { CONTENT_TYPES } from "./content.constants.js";

const uuid = Joi.string().uuid();

const nullableSubjectId = Joi.alternatives().try(
  uuid,
  Joi.valid(null, ""),
).optional();

const urlPattern =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

export const contentIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const subjectIdParamSchema = Joi.object({
  subjectId: uuid.required(),
});

export const listQuerySchema = Joi.object({
  subjectId: nullableSubjectId,
  type: Joi.string()
    .valid(...CONTENT_TYPES)
    .optional(),
});

export const createNoteSchema = Joi.object({
  type: Joi.string().valid("note").required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  content: Joi.string().trim().min(1).required(),
  subjectId: nullableSubjectId,
  isPinned: Joi.boolean().optional(),
});

export const createLinkSchema = Joi.object({
  type: Joi.string().valid("link").required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  content: Joi.string().trim().pattern(urlPattern).optional(),
  url: Joi.string().trim().pattern(urlPattern).optional(),
  subjectId: nullableSubjectId,
})
  .or("content", "url")
  .messages({
    "object.missing": "URL is required for link content",
  });

export const createContentSchema = Joi.alternatives().try(
  createNoteSchema,
  createLinkSchema,
);

export const uploadMetadataSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  subjectId: nullableSubjectId,
});

export const legacyNoteCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  content: Joi.string().trim().min(1).required(),
  subjectId: nullableSubjectId,
  isPinned: Joi.boolean().optional(),
});

export const legacyNoteUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  subjectId: nullableSubjectId,
  content: Joi.string().trim().optional(),
  isPinned: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

const updateContentFieldsSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(5000).allow("", null).optional(),
  subjectId: nullableSubjectId,
  content: Joi.string().trim().optional(),
  isPinned: Joi.boolean().optional(),
  type: Joi.forbidden(),
  fileName: Joi.forbidden().messages({
    "any.unknown": "File name cannot be edited manually. Upload a replacement file instead.",
  }),
  fileUrl: Joi.forbidden(),
  fileSize: Joi.forbidden(),
  mimeType: Joi.forbidden(),
});

export const updateContentSchema = updateContentFieldsSchema
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const updateContentMultipartSchema = updateContentFieldsSchema;
