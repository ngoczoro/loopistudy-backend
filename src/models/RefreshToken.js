import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineRefreshTokenModel = (sequelize) => {
  return sequelize.define(
    "RefreshToken",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
      },
      tokenHash: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "token_hash",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
      },
      revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    modelOptions("refresh_tokens"),
  );
};
