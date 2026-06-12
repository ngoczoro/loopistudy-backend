import Joi from "joi";
import { AI_DIFFICULTY_VALUES } from "../dtos/ai.dto.js";

const uuid = Joi.string().uuid();

/** Reusable fragments for future AI feature request validation. */
export const aiDocumentIdSchema = Joi.object({
  documentId: uuid.required(),
});

export const aiSubjectIdSchema = Joi.object({
  subjectId: uuid.required(),
});

export const aiQuizIdSchema = Joi.object({
  quizId: uuid.required(),
});

export const aiQuestionSchema = Joi.object({
  question: Joi.string().trim().min(1).max(2000).required(),
});

export const aiQuizGenerationSchema = Joi.object({
  documentId: uuid.required(),
  subjectId: uuid.optional(),
  numberOfQuestions: Joi.number().integer().min(1).max(30).default(5),
  difficulty: Joi.string()
    .valid(...AI_DIFFICULTY_VALUES)
    .default("medium"),
});

export const documentIdParamSchema = Joi.object({
  documentId: uuid.required(),
});

export const generateSummaryBodySchema = Joi.object({
  forceRegenerate: Joi.boolean().default(false),
});
