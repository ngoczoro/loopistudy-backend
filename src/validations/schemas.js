export {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordWithOtpSchema,
} from "../modules/auth/auth.validation.js";

export {
  createSubjectSchema,
  updateSubjectSchema,
} from "../modules/subjects/subject.validation.js";

export {
  changePasswordSchema,
  replaceBlockedSlotsSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "../modules/users/user.validation.js";

export {
  createPlannerSessionSchema,
  listPlannerSessionsQuerySchema,
  plannerSessionIdParamSchema,
  updatePlannerSessionSchema,
} from "../modules/planner/planner.validation.js";

/**
 * Validate request body middleware
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details[0].message,
      });
    }

    next();
  };
};

/**
 * Validate request query middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details[0].message,
      });
    }

    next();
  };
};
