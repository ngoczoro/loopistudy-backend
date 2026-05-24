import { verifyAccessToken } from "../utils/jwt.js";
import ApiError from "../utils/ApiError.js";
import { normalizeRole } from "../utils/authSerializer.js";

/**
 * Verify JWT Access Token and attach normalized user payload.
 * req.user = { userId, role }
 */
export const verifyTokenMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Access token is required");
    }

    const token = authHeader.slice(7);
    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      throw ApiError.unauthorized("Invalid token payload");
    }

    req.user = {
      userId: decoded.userId,
      role: normalizeRole(decoded.role),
    };

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
    const resourceUserId = req.params.userId;
    const requestingUserId = req.user.userId;

    if (req.user.role !== "admin" && resourceUserId !== requestingUserId) {
      throw ApiError.forbidden("You cannot access this resource");
    }

    next();
  } catch (error) {
    next(error);
  }
};
