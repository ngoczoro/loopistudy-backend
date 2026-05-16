import { Router } from "express";
import {
  register,
  resendOtp,
  verifyOtp,
  login,
  logout,
  refreshAccessToken,
} from "../controllers/authController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";
import { validateBody } from "../validations/schemas.js";
import {
  registerSchema,
  resendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validations/schemas.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = Router();

/**
 * Public routes
 * http://localhost:5000/api/v1/auth/...
 */

// 1. Register - Create user with pending status + Send OTP
router.post("/register", authLimiter, validateBody(registerSchema), register);

// 2. Resend OTP - For users who didn't receive OTP
router.post(
  "/resend-otp",
  authLimiter,
  validateBody(resendOtpSchema),
  resendOtp,
);

// 3. Verify OTP - Activate user account
router.post(
  "/verify-otp",
  authLimiter,
  validateBody(verifyOtpSchema),
  verifyOtp,
);

// 4. Login - Only works if user status is "active"
router.post("/login", authLimiter, validateBody(loginSchema), login);

// 5. Refresh Token
router.post(
  "/refresh-token",
  validateBody(refreshTokenSchema),
  refreshAccessToken,
);

/**
 * Protected routes
 */

// 6. Logout - Requires valid JWT
router.post("/logout", verifyTokenMiddleware, logout);

export default router;
