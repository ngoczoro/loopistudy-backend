import { DataTypes } from "sequelize";

export const defineStudyPlanModel = (sequelize) => {
  return sequelize.define(
    "StudyPlan",
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
      },
      description: {
        type: DataTypes.TEXT,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "start_date",
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "end_date",
      },
      studyHoursPerDay: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        field: "study_hours_per_day",
        validate: {
          min: 0,
        },
      },
      preferredStudyTime: {
        type: DataTypes.STRING(50),
        field: "preferred_study_time",
      },
      aiGenerated: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "ai_generated",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
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
      tableName: "study_plans",
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        { fields: ["user_id", "is_active"] },
        { fields: ["start_date", "end_date"] },
      ],
    },
  );
};
