import Joi from "joi";
import { MAX_QUESTION_LENGTH, MAX_SCOPE_DOCUMENTS, SCOPE_TYPE } from "./assistant.constants.js";

const uuid = Joi.string().uuid();

const scopeSchema = Joi.alternatives().try(
  Joi.object({ type: Joi.string().valid(SCOPE_TYPE.ALL).required() }),
  Joi.object({
    type: Joi.string().valid(SCOPE_TYPE.SUBJECT).required(),
    subjectId: uuid.required(),
  }),
  Joi.object({
    type: Joi.string().valid(SCOPE_TYPE.DOCUMENTS).required(),
    documentIds: Joi.array().items(uuid).min(1).max(MAX_SCOPE_DOCUMENTS).unique().required(),
  }),
);

export const conversationIdParamSchema = Joi.object({
  conversationId: uuid.required(),
});

export const createConversationSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).optional(),
  scope: scopeSchema.default({ type: SCOPE_TYPE.ALL }),
});

export const updateConversationSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).optional(),
  scope: scopeSchema.optional(),
}).min(1);

export const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(MAX_QUESTION_LENGTH).required(),
});
