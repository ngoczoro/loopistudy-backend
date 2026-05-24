import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { authLimiter } from "../../middlewares/rateLimitMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import {
  forgotPassword,
  login,
  logout,
  refreshAccessToken,
  register,
  resendOtp,
  resetPassword,
  verifyOtp,
  verifyResetOtp,
} from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordWithOtpSchema,
  verifyOtpSchema,
} from "./auth.validation.js";

const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  register,
);

authRouter.post(
  "/resend-otp",
  authLimiter,
  validateBody(resendOtpSchema),
  resendOtp,
);

authRouter.post(
  "/verify-otp",
  authLimiter,
  validateBody(verifyOtpSchema),
  verifyOtp,
);

authRouter.post("/login", authLimiter, validateBody(loginSchema), login);

authRouter.post(
  "/refresh-token",
  authLimiter,
  validateBody(refreshTokenSchema),
  refreshAccessToken,
);

authRouter.post("/logout", verifyTokenMiddleware, logout);

export const passwordRouter = Router();

passwordRouter.post(
  "/forgot",
  authLimiter,
  validateBody(forgotPasswordSchema),
  forgotPassword,
);

passwordRouter.post(
  "/verify",
  authLimiter,
  validateBody(verifyOtpSchema),
  verifyResetOtp,
);

passwordRouter.post(
  "/reset",
  authLimiter,
  validateBody(resetPasswordWithOtpSchema),
  resetPassword,
);

export default authRouter;
