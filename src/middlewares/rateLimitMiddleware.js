import rateLimit from "express-rate-limit";

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * Authentication rate limiter
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login/register attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Strict API rate limiter
 * 30 requests per minute per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Quiz submission rate limiter
 * 10 submissions per 5 minutes per IP
 */
export const quizLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "Too many quiz submissions, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
