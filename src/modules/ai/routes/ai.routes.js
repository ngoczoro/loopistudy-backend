import { Router } from "express";
import { verifyTokenMiddleware } from "../../../middlewares/authMiddleware.js";
import { health } from "../controllers/ai.controller.js";
import {
  generateDocumentSummary,
  getDocumentSummary,
} from "../controllers/summary.controller.js";
import {
  generateDocumentQuiz,
  generatePracticeQuiz,
  generateSubjectQuiz,
} from "../controllers/quiz-generator.controller.js";
import { generateDocumentFlashcards } from "../controllers/flashcard-generator.controller.js";
import {
  getResourceRecommendationHistory,
  getResourceRecommendationHistoryById,
  getResourceRecommendations,
  regenerateResourceRecommendations,
} from "../controllers/resource-recommendation.controller.js";
import {
  deleteSavedLearningResource,
  getSavedLearningResources,
  saveLearningResource,
} from "../controllers/saved-learning-resource.controller.js";
import { searchDocuments, explainDocumentSearch } from "../controllers/document-search.controller.js";
import {
  documentIdParamSchema,
  documentSearchBodySchema,
  documentSearchExplainBodySchema,
  generatePracticeQuizBodySchema,
  generateFlashcardsBodySchema,
  generateQuizBodySchema,
  generateSubjectQuizBodySchema,
  generateSummaryBodySchema,
  regenerateResourceRecommendationBodySchema,
  resourceRecommendationHistoryIdParamSchema,
  resourceRecommendationHistoryQuerySchema,
  resourceRecommendationQuerySchema,
  saveLearningResourceBodySchema,
  savedLearningResourceIdParamSchema,
  savedLearningResourceQuerySchema,
  subjectIdParamSchema,
} from "../validators/ai.validation.js";

const validateParams = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.params);

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  next();
};

const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  req.body = value;
  next();
};

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  req.validatedQuery = value;
  next();
};

const router = Router();

router.get("/health", health);

router.use(verifyTokenMiddleware);

router.get(
  "/documents/:documentId/summary",
  validateParams(documentIdParamSchema),
  getDocumentSummary,
);

router.post(
  "/documents/:documentId/summary",
  validateParams(documentIdParamSchema),
  validateBody(generateSummaryBodySchema),
  generateDocumentSummary,
);

router.post(
  "/documents/:documentId/generate-quiz",
  validateParams(documentIdParamSchema),
  validateBody(generateQuizBodySchema),
  generateDocumentQuiz,
);

router.post(
  "/documents/:documentId/generate-flashcards",
  validateParams(documentIdParamSchema),
  validateBody(generateFlashcardsBodySchema),
  generateDocumentFlashcards,
);

router.post(
  "/subjects/:subjectId/generate-quiz",
  validateParams(subjectIdParamSchema),
  validateBody(generateSubjectQuizBodySchema),
  generateSubjectQuiz,
);

router.post(
  "/generate-quiz",
  validateBody(generatePracticeQuizBodySchema),
  generatePracticeQuiz,
);

router.post(
  "/document-search",
  validateBody(documentSearchBodySchema),
  searchDocuments,
);

router.post(
  "/document-search/explain",
  validateBody(documentSearchExplainBodySchema),
  explainDocumentSearch,
);

router.get(
  "/resource-recommendations",
  validateQuery(resourceRecommendationQuerySchema),
  getResourceRecommendations,
);

router.post(
  "/resource-recommendations/regenerate",
  validateBody(regenerateResourceRecommendationBodySchema),
  regenerateResourceRecommendations,
);

router.get(
  "/resource-recommendations/history",
  validateQuery(resourceRecommendationHistoryQuerySchema),
  getResourceRecommendationHistory,
);

router.get(
  "/resource-recommendations/history/:id",
  validateParams(resourceRecommendationHistoryIdParamSchema),
  getResourceRecommendationHistoryById,
);

router.post(
  "/saved-learning-resources",
  validateBody(saveLearningResourceBodySchema),
  saveLearningResource,
);

router.get(
  "/saved-learning-resources",
  validateQuery(savedLearningResourceQuerySchema),
  getSavedLearningResources,
);

router.delete(
  "/saved-learning-resources/:id",
  validateParams(savedLearningResourceIdParamSchema),
  deleteSavedLearningResource,
);

export default router;
