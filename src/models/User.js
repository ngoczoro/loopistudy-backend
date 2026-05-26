import { DataTypes } from "sequelize";
import { ROLES, USER_STATUS } from "../config/constants.js";
import { modelOptions } from "./shared.js";

export const defineUserModel = (sequelize) => {
  return sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      fullName: {
        type: DataTypes.STRING(100),
        field: "name",
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "password_hash",
      },
      avatarUrl: {
        type: DataTypes.TEXT,
        field: "avatar_url",
      },
      role: {
        type: DataTypes.STRING(20),
        defaultValue: ROLES.STUDENT,
        validate: { isIn: [[ROLES.ADMIN, ROLES.STUDENT]] },
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: USER_STATUS.PENDING,
        validate: { isIn: [Object.values(USER_STATUS)] },
      },
      lockedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "locked_at",
      },
      lockedReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "locked_reason",
      },
    },
    modelOptions("users"),
  );
};
