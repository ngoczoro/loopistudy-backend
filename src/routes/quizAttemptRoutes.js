import { Router } from "express";
import * as quizAttemptController from "../controllers/quizAttemptController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";
import { attemptIdParamSchema } from "../validations/quizAttempt.validation.js";

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

const router = Router();

router.use(verifyTokenMiddleware);

router.get(
  "/:attemptId",
  validateParams(attemptIdParamSchema),
  quizAttemptController.getAttemptById,
);

export default router;
