import jwt from "jsonwebtoken";
import { normalizeRole } from "./authSerializer.js";

export const getRefreshTokenExpiresAt = () => {
  const expiry = process.env.JWT_REFRESH_EXPIRY || "7d";
  const match = expiry.match(/^(\d+)([smhd])$/);
  const now = new Date();

  if (!match) {
    now.setDate(now.getDate() + 7);
    return now;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(now.getTime() + value * multipliers[unit]);
};

export const generateTokens = (userId, role) => {
  const normalizedRole = normalizeRole(role);

  const accessToken = jwt.sign(
    { userId, role: normalizedRole },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
    },
  );

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};
