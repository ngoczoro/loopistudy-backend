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
    // Log email error but don't fail registration
    console.error("❌ Failed to send OTP email:", emailError.message);
    // In production, you might want to queue this for retry
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
    await otpRecord.update({
      failedAttempts: (otpRecord.failedAttempts || 0) + 1,
    });

    // Lock after 5 failed attempts
    if ((otpRecord.failedAttempts || 0) + 1 >= 5) {
      throw ApiError.badRequest("Too many failed attempts. Request a new OTP.");
    }

    throw ApiError.badRequest(
      `Invalid OTP. ${4 - (otpRecord.failedAttempts || 0)} attempts remaining.`,
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
 */
export const logout = asyncHandler(async (req, res) => {
  // In a real application, you would invalidate the refresh token here
  // For now, client should remove token from storage
  res.json(buildSuccessResponse("Logged out successfully"));
});

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh-token
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest("Refresh token is required");
  }

  // In a real application, verify the refresh token against stored tokens
  // For now, we'll use the JWT utility
  const { User } = getModels();

  // This would typically call a JWT verification utility
  // For this example, we're keeping it simple
  const user = await User.findByPk(req.user.userId);
  if (!user || user.status === "banned") {
    throw ApiError.unauthorized("Invalid user");
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
