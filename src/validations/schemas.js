import Joi from "joi";

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
 * Register schema
 */
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),

  password: Joi.string().min(8).required(),

  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),

  fullName: Joi.string().min(2).max(255).required(),
});

/**
 * Login schema
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),

  password: Joi.string().required(),
});

/**
 * Refresh token schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

/**
 * Verify OTP schema
 */
export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),

  otp: Joi.string().length(6).required(),
});

/**
 * Resend OTP schema
 */
export const resendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

/**
 * Reset password with OTP schema
 */
export const resetPasswordWithOtpSchema = Joi.object({
  email: Joi.string().email().required(),

  otp: Joi.string().length(6).required(),

  newPassword: Joi.string().min(8).required(),

  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
    }),
});
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
