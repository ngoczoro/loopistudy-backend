import Joi from "joi";
import {
  AI_DIFFICULTY_VALUES,
  AI_QUIZ_QUESTION_COUNTS,
} from "../dtos/ai.dto.js";

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
  numberOfQuestions: Joi.number()
    .integer()
    .valid(...AI_QUIZ_QUESTION_COUNTS)
    .default(5),
  difficulty: Joi.string()
    .valid(...AI_DIFFICULTY_VALUES)
    .default("mixed"),
  forceRegenerate: Joi.boolean().default(true),
});

export const documentIdParamSchema = Joi.object({
  documentId: uuid.required(),
});

export const generateSummaryBodySchema = Joi.object({
  forceRegenerate: Joi.boolean().default(false),
});

export const generateQuizBodySchema = Joi.object({
  difficulty: Joi.string()
    .valid(...AI_DIFFICULTY_VALUES)
    .default("mixed"),
  numberOfQuestions: Joi.number()
    .integer()
    .valid(...AI_QUIZ_QUESTION_COUNTS)
    .default(5),
  forceRegenerate: Joi.boolean().default(true),
});

export const subjectIdParamSchema = Joi.object({
  subjectId: uuid.required(),
});

export const generateSubjectQuizBodySchema = Joi.object({
  difficulty: Joi.string()
    .valid(...AI_DIFFICULTY_VALUES)
    .default("mixed"),
  numberOfQuestions: Joi.number()
    .integer()
    .valid(...AI_QUIZ_QUESTION_COUNTS)
    .default(5),
  forceRegenerate: Joi.boolean().default(true),
  topic: Joi.string().trim().max(200).allow("").optional(),
});

export const generatePracticeQuizBodySchema = Joi.object({
  topic: Joi.string().trim().min(1).max(200).required(),
  subjectId: uuid.optional(),
  difficulty: Joi.string()
    .valid(...AI_DIFFICULTY_VALUES)
    .default("mixed"),
  numberOfQuestions: Joi.number()
    .integer()
    .valid(...AI_QUIZ_QUESTION_COUNTS)
    .default(5),
  forceRegenerate: Joi.boolean().default(true),
});
