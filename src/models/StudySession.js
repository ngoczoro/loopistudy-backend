import { DataTypes } from "sequelize";

export const defineStudySessionModel = (sequelize) => {
  return sequelize.define(
    "StudySession",
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
      studyPlanId: {
        type: DataTypes.BIGINT,
        field: "study_plan_id",
      },
      subjectId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "subject_id",
      },
      sessionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "session_date",
      },
      scheduledStartTime: {
        type: DataTypes.TIME,
        field: "scheduled_start_time",
      },
      scheduledEndTime: {
        type: DataTypes.TIME,
        field: "scheduled_end_time",
      },
      status: {
        type: DataTypes.ENUM("pending", "active", "completed", "cancelled"),
        defaultValue: "pending",
      },
      plannedDurationMinutes: {
        type: DataTypes.INTEGER,
        field: "planned_duration_minutes",
        validate: {
          min: 1,
        },
      },
      actualDurationMinutes: {
        type: DataTypes.INTEGER,
        field: "actual_duration_minutes",
      },
      notes: {
        type: DataTypes.TEXT,
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
      tableName: "study_sessions",
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        { fields: ["user_id", "session_date", "status"] },
        { fields: ["subject_id"] },
      ],
    },
  );
};
