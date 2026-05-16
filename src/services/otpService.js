import sequelize from "../config/database.js";
import { sendOtpEmail } from "../utils/email.js";
import {
  generateOTP,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  getOTPExpirationTime,
  getOTPTimeRemaining,
} from "../utils/otp.js";
import ApiError from "../utils/ApiError.js";

/**
 * OTP Service
 * Handles all OTP-related operations
 */

/**
 * Generate and send OTP to email
 * @param {string} email - Email to send OTP to
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<Object>} Contains email and message
 */
export const sendOtpService = async (email, ipAddress, userAgent) => {
  const { EmailOtp } = sequelize.models;

  try {
    // Check if user with this email already exists
    const { User } = sequelize.models;
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      throw ApiError.conflict(
        "Email already registered. Please login instead.",
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = getOTPExpirationTime();

    // Invalidate previous OTPs for this email
    await EmailOtp.update(
      { isVerified: false },
      {
        where: {
          email,
          isVerified: false,
        },
      },
    );

    // Create new OTP record
    const otpRecord = await EmailOtp.create({
      email,
      otp,
      otpHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    // Send OTP email
    await sendOtpEmail(email, otp);

    return {
      email,
      message: "OTP sent successfully. Check your email.",
      expiresIn: 300, // 5 minutes in seconds
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Don't expose actual error in production
    if (process.env.NODE_ENV === "production") {
      throw ApiError.internalServer("Failed to send OTP. Please try again.");
    }

    throw ApiError.internalServer(`Failed to send OTP: ${error.message}`);
  }
};

/**
 * Verify OTP
 * @param {string} email - Email to verify OTP for
 * @param {string} otp - OTP entered by user
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>} Contains email and verification status
 */
export const verifyOtpService = async (email, otp, ipAddress) => {
  const { EmailOtp } = sequelize.models;

  try {
    // Find latest OTP for this email
    const otpRecord = await EmailOtp.findOne({
      where: {
        email,
        isVerified: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!otpRecord) {
      throw ApiError.notFound("No OTP found. Please request a new one.");
    }

    // Check if OTP is expired
    if (isOTPExpired(otpRecord.expiresAt)) {
      throw ApiError.badRequest("OTP has expired. Please request a new one.");
    }

    // Check max attempts
    const MAX_ATTEMPTS = 5;
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      throw ApiError.badRequest(
        "Too many failed attempts. Please request a new OTP.",
      );
    }

    // Verify OTP
    const isOtpValid = await verifyOTP(otp, otpRecord.otpHash);

    if (!isOtpValid) {
      // Increment attempt counter
      await otpRecord.update({
        attempts: otpRecord.attempts + 1,
        lastAttemptAt: new Date(),
      });

      const remainingAttempts = MAX_ATTEMPTS - (otpRecord.attempts + 1);

      if (remainingAttempts === 0) {
        throw ApiError.badRequest(
          "Too many failed attempts. Please request a new OTP.",
        );
      }

      throw ApiError.badRequest(
        `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      );
    }

    // Mark OTP as verified
    await otpRecord.update({
      isVerified: true,
      verifiedAt: new Date(),
    });

    return {
      email,
      verified: true,
      message: "OTP verified successfully.",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (process.env.NODE_ENV === "production") {
      throw ApiError.internalServer("Failed to verify OTP. Please try again.");
    }

    throw ApiError.internalServer(`Failed to verify OTP: ${error.message}`);
  }
};

/**
 * Check if email OTP is verified
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if verified
 */
export const isEmailVerified = async (email) => {
  const { EmailOtp } = sequelize.models;

  const verifiedOtp = await EmailOtp.findOne({
    where: {
      email,
      isVerified: true,
    },
    order: [["verifiedAt", "DESC"]],
  });

  return !!verifiedOtp;
};

/**
 * Get OTP status for email
 * @param {string} email - Email to check
 * @returns {Promise<Object>} OTP status information
 */
export const getOtpStatus = async (email) => {
  const { EmailOtp } = sequelize.models;

  const otpRecord = await EmailOtp.findOne({
    where: {
      email,
      isVerified: false,
    },
    order: [["createdAt", "DESC"]],
    attributes: ["expiresAt", "attempts"],
  });

  if (!otpRecord) {
    return {
      hasOtp: false,
      message: "No active OTP for this email.",
    };
  }

  if (isOTPExpired(otpRecord.expiresAt)) {
    return {
      hasOtp: false,
      expired: true,
      message: "OTP has expired.",
    };
  }

  const timeRemaining = getOTPTimeRemaining(otpRecord.expiresAt);
  const remainingAttempts = 5 - otpRecord.attempts;

  return {
    hasOtp: true,
    expired: false,
    timeRemaining,
    remainingAttempts,
    message: `OTP valid for ${Math.ceil(timeRemaining / 60)} more minutes.`,
  };
};

/**
 * Clean up expired OTPs (run periodically)
 * @returns {Promise<number>} Number of deleted OTPs
 */
export const cleanupExpiredOtps = async () => {
  const { EmailOtp } = sequelize.models;

  try {
    const deleted = await EmailOtp.destroy({
      where: {
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date(),
        },
      },
    });

    console.log(`✓ Cleaned up ${deleted} expired OTPs`);
    return deleted;
  } catch (error) {
    console.error("✗ Error cleaning up expired OTPs:", error);
    return 0;
  }
};

/**
 * Delete OTP records for email (after successful registration)
 * @param {string} email - Email to clean up
 * @returns {Promise<boolean>} Success status
 */
export const deleteEmailOtps = async (email) => {
  const { EmailOtp } = sequelize.models;

  try {
    await EmailOtp.destroy({
      where: { email },
    });
    return true;
  } catch (error) {
    console.error("✗ Error deleting OTP records:", error);
    return false;
  }
};
