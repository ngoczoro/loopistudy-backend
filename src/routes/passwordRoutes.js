import { Router } from "express";
import { forgotPassword, resetPassword, verifyResetOtp } from "../controllers/authController.js";
import { validateBody } from "../validations/schemas.js";
import { forgotPasswordSchema, resetPasswordWithOtpSchema, verifyOtpSchema } from "../validations/schemas.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = Router();

/**
 * Password routes
 * http://localhost:5000/api/v1/password/...
 */

// 1. Forgot Password - Request OTP
router.post("/forgot", authLimiter, validateBody(forgotPasswordSchema), forgotPassword);

// 2. Verify OTP for Reset (Check only)
router.post("/verify", authLimiter, validateBody(verifyOtpSchema), verifyResetOtp);

// 3. Reset Password - Verify OTP and Update Password
router.post("/reset", authLimiter, validateBody(resetPasswordWithOtpSchema), resetPassword);

export default router;
