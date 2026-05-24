import Joi from "joi";

export {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordWithOtpSchema,
} from "../modules/auth/auth.validation.js";

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
 * Create subject schema
 */
export const createSubjectSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),

  color: Joi.string().optional(),

  difficulty: Joi.string().valid("easy", "medium", "hard").optional(),

  description: Joi.string().allow("").optional(),
});

/**
 * Update subject schema
 */
export const updateSubjectSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),

  color: Joi.string().optional(),

  difficulty: Joi.string().valid("easy", "medium", "hard").optional(),

  description: Joi.string().allow("").optional(),
});
