import {
  verifyAdmin,
  verifyTokenMiddleware,
} from "../../../middlewares/authMiddleware.js";

/** Admin route guard — JWT + admin role. */
export const requireAdmin = [verifyTokenMiddleware, verifyAdmin];

export const validateParams = (schema) => (req, res, next) => {
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

export const validateQuery = (schema) => (req, res, next) => {
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
