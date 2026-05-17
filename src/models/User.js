import { DataTypes } from "sequelize";

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
        type: DataTypes.STRING(50),
        defaultValue: "USER",
      },
      status: {
        type: DataTypes.STRING(50),
        defaultValue: "PENDING",
      },
    },
    {
      tableName: "users",
      schema: "learning_app",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    },
  );
};
