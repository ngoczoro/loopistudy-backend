import crypto from "crypto";
import bcrypt from "bcrypt";

/**
 * Generate random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

/**
 * Hash OTP using bcrypt
 * @param {string} otp - Plain text OTP
 * @returns {Promise<string>} Hashed OTP
 */
export const hashOTP = async (otp) => {
  return bcrypt.hash(otp, 10);
};

/**
 * Verify OTP against hash
 * @param {string} otp - Plain text OTP
 * @param {string} hash - Hashed OTP
 * @returns {Promise<boolean>} True if OTP matches hash
 */
export const verifyOTP = async (otp, hash) => {
  return bcrypt.compare(otp, hash);
};

/**
 * Check if OTP has expired
 * @param {Date} expiresAt - Expiration timestamp
 * @returns {boolean} True if expired
 */
export const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

/**
 * Calculate OTP expiration time (5 minutes from now)
 * @returns {Date} Expiration date
 */
export const getOTPExpirationTime = () => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes
  return expiresAt;
};

/**
 * Get OTP expiration time remaining in seconds
 * @param {Date} expiresAt - Expiration timestamp
 * @returns {number} Seconds remaining (0 if expired)
 */
export const getOTPTimeRemaining = (expiresAt) => {
  const now = new Date();
  const expiration = new Date(expiresAt);
  const difference = expiration - now;

  if (difference <= 0) return 0;

  return Math.floor(difference / 1000); // Convert to seconds
};

/**
 * Generate secure token for OTP verification
 * Used to prevent token reuse/replay attacks
 * @returns {string} Random token
 */
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};
