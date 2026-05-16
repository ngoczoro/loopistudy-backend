import { verifyAccessToken } from "../utils/jwt.js";
import ApiError from "../utils/ApiError.js";

/**
 * Verify JWT Access Token
 */
export const verifyTokenMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Access token is required");
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const decoded = verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    next(
      error instanceof ApiError
        ? error
        : ApiError.unauthorized("Invalid token"),
    );
  }
};

/**
 * Verify User Role
 */
export const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("User not authenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          "You do not have permission to access this resource",
        ),
      );
    }

    next();
  };
};

/**
 * Verify Admin Role
 */
export const verifyAdmin = verifyRole("admin");

/**
 * Verify User Ownership
 */
export const verifyOwnership = async (req, res, next) => {
  try {
    const resourceUserId = parseInt(req.params.userId);
    const requestingUserId = req.user.userId;

    // Allow admins to access any resource, users can only access their own
    if (req.user.role !== "admin" && resourceUserId !== requestingUserId) {
      throw ApiError.forbidden("You cannot access this resource");
    }

    next();
  } catch (error) {
    next(error);
  }
};
