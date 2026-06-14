import { Router } from "express";
import * as quizController from "../controllers/quizController.js";
import * as quizAttemptController from "../controllers/quizAttemptController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";
import {
  quizIdParamSchema,
  submitQuizAttemptSchema,
} from "../validations/quizAttempt.validation.js";
import {
  quizIdParamSchema as quizUpdateIdParamSchema,
  updateQuizTitleSchema,
} from "../validations/quiz.validation.js";

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

router.use(verifyTokenMiddleware);

router.post("/", quizController.create);
router.get("/", quizController.getAll);

router.post(
  "/:quizId/attempts",
  validateParams(quizIdParamSchema),
  validateBody(submitQuizAttemptSchema),
  quizAttemptController.submitAttempt,
);

router.get(
  "/:quizId/attempts/latest",
  validateParams(quizIdParamSchema),
  quizAttemptController.getLatestAttempt,
);

router.get(
  "/:quizId/attempts",
  validateParams(quizIdParamSchema),
  quizAttemptController.listAttempts,
);

router.get("/:id", quizController.getById);
router.patch(
  "/:id",
  validateParams(quizUpdateIdParamSchema),
  validateBody(updateQuizTitleSchema),
  quizController.patchTitle,
);
router.put("/:id", quizController.update);
router.delete("/:id", quizController.remove);

export default router;
