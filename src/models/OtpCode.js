import { DataTypes } from 'sequelize';

export const defineOtpCodeModel = (sequelize) => {
  return sequelize.define('OtpCode', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'code',
    },
    otpHash: {
      type: DataTypes.TEXT,
      field: 'otp_hash',
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(20),
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expired_at',
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_used',
    },
    failedAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failed_attempts',
    },
    verifiedAt: {
      type: DataTypes.DATE,
      field: 'verified_at',
    },
  }, {
    tableName: 'otp_codes',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};
