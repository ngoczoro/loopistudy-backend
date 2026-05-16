import sequelize from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTokens } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse } from "../utils/response.js";
import { sendOtpEmail } from "../utils/email.js";
import {
  generateOTP,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  getOTPExpirationTime,
} from "../utils/otp.js";

const getModels = () => sequelize.models;

/**
 * Register User (Create with pending status + Auto-send OTP)
 * POST /api/v1/auth/register
 *
 * Flow:
 * 1. Create user with status="pending"
 * 2. Generate 6-digit OTP
 * 3. Send OTP to email
 * 4. User cannot login until OTP verified
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  const { User, EmailOtp } = getModels();

  // Check if email already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw ApiError.conflict("Email already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user with pending status
  const user = await User.create({
    email,
    passwordHash,
    fullName,
    role: "user",
    status: "pending", // User cannot login until OTP verified
  });

  // Generate OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = getOTPExpirationTime();

  // Invalidate previous OTPs for this email
  await EmailOtp.update({ isUsed: true }, { where: { email, isUsed: false } });

  // Create new OTP record
  await EmailOtp.create({
    email,
    otp,
    otpHash,
    expiresAt,
    userId: user.id,
  });

  // Send OTP email
  try {
    await sendOtpEmail(email, otp);
  } catch (emailError) {
    console.error("❌ Failed to send OTP email:", emailError.message);
  }

  res.status(201).json(
    buildSuccessResponse(
      "User registered successfully. Check your email for OTP.",
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          status: user.status,
          message: "OTP sent to your email. Verify within 5 minutes.",
        },
      },
    ),
  );
});

/**
 * Resend OTP
 * POST /api/v1/auth/resend-otp
 *
 * For users who didn't receive or lost their OTP
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { User, EmailOtp } = getModels();

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Can only resend if user is pending
  if (user.status !== "pending") {
    throw ApiError.badRequest("OTP resend only available for pending users");
  }

  // Generate new OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = getOTPExpirationTime();

  // Invalidate previous OTPs
  await EmailOtp.update({ isUsed: true }, { where: { email, isUsed: false } });

  // Create new OTP
  await EmailOtp.create({
    email,
    otp,
    otpHash,
    expiresAt,
    userId: user.id,
  });

  // Send OTP email
  try {
    await sendOtpEmail(email, otp);
  } catch (emailError) {
    console.error("❌ Failed to send OTP email:", emailError.message);
  }

  res.json(
    buildSuccessResponse("OTP resent to your email", {
      email,
      message: "New OTP sent. Expires in 5 minutes.",
    }),
  );
});

/**
 * Verify OTP and Activate User
 * POST /api/v1/auth/verify-otp
 *
 * Flow:
 * 1. Verify email + OTP
 * 2. Check OTP not expired (5 min)
 * 3. Check OTP not used before
 * 4. Update user status to "active"
 * 5. Mark OTP as used
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { User, EmailOtp } = getModels();

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Check if already verified
  if (user.status === "active") {
    throw ApiError.badRequest("User already verified. Please login.");
  }

  // Find latest OTP for this email
  const otpRecord = await EmailOtp.findOne({
    where: { email, isUsed: false },
    order: [["createdAt", "DESC"]],
  });

  if (!otpRecord) {
    throw ApiError.notFound("No OTP found. Please request a new one.");
  }

  // Check if OTP expired
  if (isOTPExpired(otpRecord.expiresAt)) {
    throw ApiError.badRequest("OTP has expired. Request a new one.");
  }

  // Verify OTP hash
  const isValidOtp = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValidOtp) {
    // Increment failed attempts
    const failedAttempts = (otpRecord.failedAttempts || 0) + 1;
    await otpRecord.update({ failedAttempts });

    // Lock after 5 failed attempts
    if (failedAttempts >= 5) {
      throw ApiError.badRequest("Too many failed attempts. Request a new OTP.");
    }

    throw ApiError.badRequest(
      `Invalid OTP. ${5 - failedAttempts} attempts remaining.`,
    );
  }

  // Mark OTP as used
  await otpRecord.update({
    isUsed: true,
    verifiedAt: new Date(),
  });

  // Update user status to active
  await user.update({ status: "active" });

  res.json(
    buildSuccessResponse("Email verified successfully. You can now login.", {
      email,
      status: "active",
      message: "User verified. Ready to login.",
    }),
  );
});

/**
 * Login User (Only if status = "active")
 * POST /api/v1/auth/login
 *
 * Flow:
 * 1. Verify email + password
 * 2. Check user status is "active" (not pending/banned/etc)
 * 3. Generate JWT tokens
 * 4. Update last login time
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { User } = getModels();

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Check if user is verified
  if (user.status === "pending") {
    throw ApiError.badRequest(
      "Please verify your email with OTP before logging in",
    );
  }

  if (user.status === "banned") {
    throw ApiError.forbidden("Your account has been banned");
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  // Update last login
  await user.update({ lastLoginAt: new Date() });

  res.json(
    buildSuccessResponse("Login successful", {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    }),
  );
});

/**
 * Logout User
 * POST /api/v1/auth/logout
 *
 * Protected route - requires valid JWT token
 */
export const logout = asyncHandler(async (req, res) => {
  // In production, you would invalidate the refresh token here
  // For now, client removes token from localStorage
  res.json(buildSuccessResponse("Logged out successfully"));
});

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh-token
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const { User } = getModels();

  if (!refreshToken) {
    throw ApiError.badRequest("Refresh token is required");
  }

  // Verify user still exists and is active
  const user = await User.findByPk(req.user.userId);
  if (!user) {
    throw ApiError.unauthorized("User not found");
  }

  if (user.status === "banned") {
    throw ApiError.forbidden("Your account has been banned");
  }

  // Generate new tokens
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    generateTokens(user.id, user.role);

  res.json(
    buildSuccessResponse("Token refreshed", {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }),
  );
});

/**
 * Forgot Password - Request OTP
 * POST /api/v1/password/forgot
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { User, EmailOtp } = getModels();

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError.notFound("No account found with this email");
  }

  // Generate OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = getOTPExpirationTime();

  // Invalidate previous OTPs
  await EmailOtp.update({ isUsed: true }, { where: { email, isUsed: false } });

  // Create new OTP
  await EmailOtp.create({
    email,
    otp,
    otpHash,
    expiresAt,
    userId: user.id,
  });

  // Send OTP email
  try {
    await sendOtpEmail(email, otp);
  } catch (emailError) {
    console.error("❌ Failed to send forgot password OTP email:", emailError.message);
  }

  res.json(buildSuccessResponse("OTP sent to your email. Please check your inbox."));
});

/**
 * Verify OTP for Reset (Check only, don't mark as used)
 * POST /api/v1/password/verify
 */
export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { EmailOtp } = getModels();

  // Find latest unused OTP
  const otpRecord = await EmailOtp.findOne({
    where: { email, isUsed: false },
    order: [["createdAt", "DESC"]],
  });

  if (!otpRecord) {
    throw ApiError.notFound("No active OTP found.");
  }

  if (isOTPExpired(otpRecord.expiresAt)) {
    throw ApiError.badRequest("OTP has expired.");
  }

  const isValid = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValid) {
    throw ApiError.badRequest("Invalid OTP code.");
  }

  res.json(buildSuccessResponse("OTP is valid."));
});

/**
 * Reset Password with OTP
 * POST /api/v1/password/reset
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const { User, EmailOtp } = getModels();

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Find latest unused OTP
  const otpRecord = await EmailOtp.findOne({
    where: { email, isUsed: false },
    order: [["createdAt", "DESC"]],
  });

  if (!otpRecord) {
    throw ApiError.notFound("No active OTP found. Please request a new one.");
  }

  // Check expiration
  if (isOTPExpired(otpRecord.expiresAt)) {
    throw ApiError.badRequest("OTP has expired. Please request a new one.");
  }

  // Verify OTP
  const isValid = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValid) {
    throw ApiError.badRequest("Invalid OTP code.");
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user
  await user.update({ passwordHash });

  // Mark OTP as used
  await otpRecord.update({ isUsed: true, verifiedAt: new Date() });

  res.json(buildSuccessResponse("Your password has been reset successfully."));
});
