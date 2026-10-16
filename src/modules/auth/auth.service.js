import crypto from "crypto";
import ApiError from "../../utils/ApiError.js";
import { sendOtpEmail } from "../../utils/email.js";
import {
  hashPassword,
  verifyAgainstDummyHash,
  verifyPassword,
} from "../../utils/password.js";
import {
  generateOTP,
  getOTPExpirationTime,
  hashOTP,
  isOTPExpired,
  verifyOTP,
} from "../../utils/otp.js";
import {
  generateTokens,
  getRefreshTokenExpiresAt,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import { ROLES, USER_STATUS } from "../../config/constants.js";
import { MAX_OTP_ATTEMPTS } from "./auth.constants.js";
import * as authRepository from "./auth.repository.js";
import {
  serializeLogin,
  serializeRefreshTokens,
  serializeResendOtp,
  serializeUser,
} from "./auth.serializer.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const sendOtpWithLogging = async (email, otp, logLabel = "OTP CODE") => {
  console.log(`\n======================================`);
  console.log(`🔑 ${logLabel} FOR ${email}: ${otp}`);
  console.log(`======================================\n`);

  try {
    await sendOtpEmail(email, otp);
  } catch (emailError) {
    console.error("❌ Failed to send OTP email:", emailError.message);
  }
};

const createAndSendOtp = async ({ email, userId, logLabel }) => {
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = getOTPExpirationTime();

  await authRepository.invalidateActiveOtpsForEmail(email);
  await authRepository.createOtpRecord({
    email,
    otp,
    otpHash,
    expiresAt,
    userId,
  });

  await sendOtpWithLogging(email, otp, logLabel);
  return otp;
};

const assertUserCanLogin = (user) => {
  if (user.status === USER_STATUS.PENDING) {
    throw ApiError.badRequest(
      "Please verify your email with OTP before logging in",
    );
  }

  if (user.status === USER_STATUS.BANNED) {
    throw ApiError.forbidden("Your account has been banned");
  }

  if (user.status === USER_STATUS.LOCKED) {
    throw ApiError.forbidden("Your account has been locked");
  }
};

const assertUserCanRefresh = (user) => {
  if (user.status === USER_STATUS.BANNED) {
    throw ApiError.forbidden("Your account has been banned");
  }

  if (user.status === USER_STATUS.LOCKED) {
    throw ApiError.forbidden("Your account has been locked");
  }
};

const persistRefreshToken = async (userId, rawToken) => {
  return authRepository.createRefreshToken({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: getRefreshTokenExpiresAt(),
    revoked: false,
  });
};

export const issueAuthTokens = async (user) => {
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await persistRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
};

export const rotateRefreshToken = async (rawRefreshToken) => {
  let decoded;

  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const tokenRecord = await authRepository.findActiveRefreshToken({
    tokenHash: hashToken(rawRefreshToken),
    userId: decoded.userId,
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token not found or expired");
  }

  const user = await authRepository.findUserById(decoded.userId);
  if (!user) {
    throw ApiError.unauthorized("User not found");
  }

  assertUserCanRefresh(user);

  await authRepository.revokeRefreshToken(tokenRecord);
  const { accessToken, refreshToken } = await issueAuthTokens(user);

  return serializeRefreshTokens(accessToken, refreshToken);
};

export const revokeAllUserRefreshTokens = async (userId) => {
  await authRepository.revokeAllRefreshTokensForUser(userId);
};

export const register = async ({ email, password, fullName }) => {
  let user = await authRepository.findUserByEmail(email);

  if (user) {
    if (user.status === USER_STATUS.PENDING) {
      const passwordHash = await hashPassword(password);
      await authRepository.updateUser(user, { passwordHash, fullName });
    } else {
      throw ApiError.conflict("Email already registered");
    }
  } else {
    const passwordHash = await hashPassword(password);
    user = await authRepository.createUser({
      email,
      passwordHash,
      fullName,
      role: ROLES.STUDENT,
      status: USER_STATUS.PENDING,
    });
  }

  await createAndSendOtp({ email, userId: user.id, logLabel: "OTP CODE" });

  return { user: serializeUser(user) };
};

export const resendOtp = async ({ email }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (user.status !== USER_STATUS.PENDING) {
    throw ApiError.badRequest("OTP resend only available for pending users");
  }

  await createAndSendOtp({ email, userId: user.id, logLabel: "OTP CODE" });

  return serializeResendOtp(email);
};

export const verifyOtp = async ({ email, otp }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (user.status === USER_STATUS.ACTIVE) {
    throw ApiError.badRequest("User already verified. Please login.");
  }

  const otpRecord = await authRepository.findLatestActiveOtp(email);
  if (!otpRecord) {
    throw ApiError.notFound("No OTP found. Please request a new one.");
  }

  if (isOTPExpired(otpRecord.expiresAt)) {
    throw ApiError.badRequest("OTP has expired. Request a new one.");
  }

  const isValidOtp = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValidOtp) {
    const failedAttempts = (otpRecord.failedAttempts || 0) + 1;
    await authRepository.updateOtpRecord(otpRecord, { failedAttempts });

    if (failedAttempts >= MAX_OTP_ATTEMPTS) {
      throw ApiError.badRequest("Too many failed attempts. Request a new OTP.");
    }

    throw ApiError.badRequest(
      `Invalid OTP. ${MAX_OTP_ATTEMPTS - failedAttempts} attempts remaining.`,
    );
  }

  await authRepository.updateOtpRecord(otpRecord, {
    isUsed: true,
    verifiedAt: new Date(),
  });
  await authRepository.updateUser(user, { status: USER_STATUS.ACTIVE });
  await authRepository.reloadUser(user);

  return { user: serializeUser(user) };
};

export const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email);
  const isPasswordValid = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyAgainstDummyHash(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  assertUserCanLogin(user);

  const { accessToken, refreshToken } = await issueAuthTokens(user);
  return serializeLogin(user, accessToken, refreshToken);
};

export const logout = async (userId) => {
  await revokeAllUserRefreshTokens(userId);
};

export const refreshAccessToken = async ({ refreshToken }) => {
  return rotateRefreshToken(refreshToken);
};

export const forgotPassword = async ({ email }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw ApiError.notFound("No account found with this email");
  }

  await createAndSendOtp({
    email,
    userId: user.id,
    logLabel: "RESET OTP",
  });
};

export const verifyResetOtp = async ({ email, otp }) => {
  const otpRecord = await authRepository.findLatestActiveOtp(email);
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
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const otpRecord = await authRepository.findLatestActiveOtp(email);
  if (!otpRecord) {
    throw ApiError.notFound("No active OTP found. Please request a new one.");
  }

  if (isOTPExpired(otpRecord.expiresAt)) {
    throw ApiError.badRequest("OTP has expired. Please request a new one.");
  }

  const isValid = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValid) {
    throw ApiError.badRequest("Invalid OTP code.");
  }

  const passwordHash = await hashPassword(newPassword);
  await authRepository.updateUser(user, { passwordHash });
  await authRepository.updateOtpRecord(otpRecord, {
    isUsed: true,
    verifiedAt: new Date(),
  });
  await revokeAllUserRefreshTokens(user.id);

  return { user: serializeUser(user) };
};
