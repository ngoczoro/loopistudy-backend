import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import { logAuthFailure } from "../../shared/security/securityAudit.service.js";
import * as authService from "./auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res
    .status(201)
    .json(
      buildSuccessResponse(
        "User registered successfully. Check your email for OTP.",
        result,
      ),
    );
});

export const resendOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendOtp(req.body);
  res.json(buildSuccessResponse("OTP resent to your email", result));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body);
  res.json(
    buildSuccessResponse(
      "Email verified successfully. You can now login.",
      result,
    ),
  );
});

export const login = asyncHandler(async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(buildSuccessResponse("Login successful", result));
  } catch (error) {
    if (error?.statusCode === 401) {
      await logAuthFailure(req, { email: req.body?.email ?? null });
    }
    throw error;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.userId);
  res.json(buildSuccessResponse("Logged out successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshAccessToken(req.body);
  res.json(buildSuccessResponse("Token refreshed", result));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  res.json(
    buildSuccessResponse("OTP sent to your email. Please check your inbox."),
  );
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  await authService.verifyResetOtp(req.body);
  res.json(buildSuccessResponse("OTP is valid."));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(
    buildSuccessResponse("Your password has been reset successfully.", result),
  );
});
