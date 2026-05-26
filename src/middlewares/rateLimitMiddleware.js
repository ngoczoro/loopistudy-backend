import rateLimit from "express-rate-limit";
import { logSecurityEvent } from "../shared/security/securityAudit.service.js";

const isDevelopment = () => process.env.NODE_ENV === "development";
const isTest = () => process.env.NODE_ENV === "test";

const skipInDev = () => isDevelopment();
const skipInDevOrTest = () => isDevelopment() || isTest();

const rateLimitResponse = (limiterName) => (req, res, _next, options) => {
  logSecurityEvent({
    eventType: "rate_limit_exceeded",
    userId: req.user?.userId ?? null,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
    metadata: {
      limiter: limiterName,
      method: req.method,
      requestCount: options.limit,
      windowMs: options.windowMs,
    },
  }).catch((error) => {
    console.warn("[security] rate limit audit log failed:", error.message);
  });

  res.status(options.statusCode).json({
    success: false,
    message:
      typeof options.message === "string"
        ? options.message
        : "Too many requests. Please try again later.",
  });
};

/**
 * General API rate limiter — relaxed for SPA usage.
 * 3000 requests per 15 minutes per IP (skipped in development).
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevOrTest,
  handler: rateLimitResponse("general"),
});

/**
 * Authentication rate limiter — brute-force protection only.
 * 20 attempts per 15 minutes per IP (skipped in development).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many login/register attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInDev,
  handler: rateLimitResponse("auth"),
});

/**
 * Optional strict limiter for sensitive write endpoints only.
 * Not applied globally — import where needed.
 */
export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 2000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevOrTest,
  handler: rateLimitResponse("strict"),
});

/**
 * Quiz submission rate limiter — monitoring-friendly cap.
 */
export const quizLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: "Too many quiz submissions, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevOrTest,
  handler: rateLimitResponse("quiz"),
});
