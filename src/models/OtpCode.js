import { DataTypes } from "sequelize";
import { OTP_TYPES } from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineOtpCodeModel = (sequelize) => {
  return sequelize.define(
    "OtpCode",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "user_id",
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      otp: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: "code",
      },
      otpHash: {
        type: DataTypes.TEXT,
        field: "otp_hash",
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING(30),
        validate: { isIn: [OTP_TYPES] },
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expired_at",
      },
      isUsed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_used",
      },
      failedAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "failed_attempts",
      },
      verifiedAt: {
        type: DataTypes.DATE,
        field: "verified_at",
      },
    },
    modelOptions("otp_codes"),
  );
};
