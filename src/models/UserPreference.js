import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineUserPreferenceModel = (sequelize) => {
  return sequelize.define(
    "UserPreference",
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        field: "user_id",
      },
      pomodoroDurationMin: {
        type: DataTypes.INTEGER,
        defaultValue: 25,
        field: "pomodoro_duration_min",
      },
      breakDurationMin: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        field: "break_duration_min",
      },
      notifyTaskReminders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "notify_task_reminders",
      },
      notifySessionReminders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "notify_session_reminders",
      },
      notifyDeadlineAlerts: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "notify_deadline_alerts",
      },
    },
    modelOptions("user_preferences"),
  );
};
