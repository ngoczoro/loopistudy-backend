import { DataTypes } from "sequelize";

export const defineUserModel = (sequelize) => {
  return sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },
      fullName: {
        type: DataTypes.STRING(255),
        field: "full_name",
      },
      avatarUrl: {
        type: DataTypes.STRING(500),
        field: "avatar_url",
      },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        defaultValue: "user",
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "active",
          "warned",
          "banned",
          "inactive",
        ),
        defaultValue: "pending",
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        field: "last_login_at",
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
      deletedAt: {
        type: DataTypes.DATE,
        field: "deleted_at",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        { fields: ["email"] },
        { fields: ["role"] },
        { fields: ["status"] },
      ],
    },
  );
};
