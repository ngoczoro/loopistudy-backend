import Joi from "joi";
import {
  AI_DIFFICULTY_VALUES,
  AI_QUIZ_QUESTION_COUNTS,
} from "../dtos/ai.dto.js";

const uuid = Joi.string().uuid();

const optionalSubjectId = uuid.optional().allow(null, "").empty(null).empty("");

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

export const resourceRecommendationQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(100).required(),
  limit: Joi.number().integer().min(1).max(10).default(5),
  subjectId: uuid.optional(),
});

export const regenerateResourceRecommendationBodySchema = Joi.object({
  q: Joi.string().trim().min(2).max(100).required(),
  limit: Joi.number().integer().min(1).max(10).default(5),
  subjectId: uuid.optional(),
});

export const resourceRecommendationHistoryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(5),
  subjectId: uuid.optional(),
});

export const resourceRecommendationHistoryIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const saveLearningResourceBodySchema = Joi.object({
  resourceId: Joi.string().trim().max(120).required(),
  title: Joi.string().trim().max(255).required(),
  type: Joi.string().trim().max(50).required(),
  provider: Joi.string().trim().max(120).required(),
  url: Joi.string().uri().required(),
  reason: Joi.string().trim().max(500).allow("").optional(),
  topics: Joi.array().items(Joi.string().trim().max(80)).max(20).optional(),
  subjectId: optionalSubjectId,
  sourceQuery: Joi.string().trim().max(100).allow("").optional(),
});

export const savedLearningResourceQuerySchema = Joi.object({
  subjectId: optionalSubjectId,
});

export const savedLearningResourceIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const documentSearchBodySchema = Joi.object({
  query: Joi.string().trim().min(2).max(300).required(),
  documentId: uuid.optional(),
  subjectId: uuid.optional(),
  limit: Joi.number().integer().min(1).max(10).default(5),
})
  .or("documentId", "subjectId")
  .messages({
    "object.missing": "Either documentId or subjectId is required",
  });

export const documentSearchExplainBodySchema = Joi.object({
  query: Joi.string().trim().min(2).max(300).required(),
  passages: Joi.array()
    .items(
      Joi.object({
        documentId: uuid.required(),
        documentTitle: Joi.string().trim().max(255).optional(),
        subjectId: uuid.optional().allow(null),
        subjectName: Joi.string().trim().max(120).optional(),
        excerpt: Joi.string().trim().min(1).max(2000).required(),
        score: Joi.number().min(0).max(1).optional(),
      }),
    )
    .min(1)
    .max(10)
    .required(),
});
