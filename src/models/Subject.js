import { DataTypes } from "sequelize";

export const defineSubjectModel = (sequelize) => {
  return sequelize.define(
    "Subject",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "user_id",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
      },
      color: {
        type: DataTypes.STRING(50),
      },
      difficulty: {
        type: DataTypes.ENUM("easy", "medium", "hard"),
        defaultValue: "medium",
      },
      targetHours: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: "target_hours",
        validate: {
          min: 0,
        },
      },
      completedHours: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: "completed_hours",
      },
      status: {
        type: DataTypes.ENUM("active", "completed", "archived"),
        defaultValue: "active",
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
      tableName: "subjects",
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [{ fields: ["user_id", "status"] }, { fields: ["created_at"] }],
    },
  );
};
