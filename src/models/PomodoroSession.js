import { DataTypes } from "sequelize";

export const definePomodoroSessionModel = (sequelize) => {
  return sequelize.define(
    "PomodoroSession",
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
      studySessionId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "study_session_id",
      },
      sessionNumber: {
        type: DataTypes.INTEGER,
        field: "session_number",
      },
      startTime: {
        type: DataTypes.DATE,
        field: "start_time",
      },
      endTime: {
        type: DataTypes.DATE,
        field: "end_time",
      },
      durationMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 25,
        field: "duration_minutes",
        validate: {
          min: 1,
        },
      },
      actualWorkTimeMinutes: {
        type: DataTypes.INTEGER,
        field: "actual_work_time_minutes",
      },
      breakTimeMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        field: "break_time_minutes",
      },
      isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_completed",
      },
      pauseCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "pause_count",
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
      tableName: "pomodoro_sessions",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["user_id", "created_at"] },
        { fields: ["study_session_id"] },
      ],
    },
  );
};
