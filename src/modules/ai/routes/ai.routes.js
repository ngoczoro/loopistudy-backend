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
import {
  documentIdParamSchema,
  generatePracticeQuizBodySchema,
  generateQuizBodySchema,
  generateSubjectQuizBodySchema,
  generateSummaryBodySchema,
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

export default router;
