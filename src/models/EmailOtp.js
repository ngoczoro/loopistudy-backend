import { DataTypes } from "sequelize";

export const defineEmailOtpModel = (sequelize) => {
  return sequelize.define(
    "EmailOtp",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      userId: {
        type: DataTypes.BIGINT,
        field: "user_id",
      },
      otp: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      otpHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "otp_hash",
      },
      isUsed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_used",
      },
      verifiedAt: {
        type: DataTypes.DATE,
        field: "verified_at",
      },
      expiresAt: {
        type: DataTypes.DATE,
        field: "expires_at",
        allowNull: false,
      },
      failedAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "failed_attempts",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "email_otps",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["email"] },
        { fields: ["email", "is_used"] },
        { fields: ["expires_at"] },
        { fields: ["user_id"] },
      ],
    },
  );
};
