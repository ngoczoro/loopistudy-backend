import ApiError from "../utils/ApiError.js";

/**
 * Global Error Handler Middleware
 */
export const errorMiddleware = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors = null;

  // Handle Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = "Validation error";
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    message = "Duplicate entry";
    errors = err.errors.map((e) => ({
      field: e.path,
      message: `${e.path} already exists`,
    }));
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired";
  }

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      statusCode,
      message,
      errors,
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors:
      process.env.NODE_ENV === "development" ? errors || err.message : null,
  });
};

/**
 * 404 Not Found Middleware
 */
export const notFoundMiddleware = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
