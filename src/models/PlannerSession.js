import { DataTypes } from "sequelize";
import { PLANNER_SESSION_SOURCES } from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const definePlannerSessionModel = (sequelize) => {
  return sequelize.define(
    "PlannerSession",
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
      subjectId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "subject_id",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      dayOfWeek: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        field: "day_of_week",
        validate: { min: 0, max: 6 },
      },
      startHour: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        field: "start_hour",
      },
      durationHours: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        field: "duration_hours",
      },
      color: {
        type: DataTypes.STRING(30),
      },
      weekStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "week_start_date",
      },
      source: {
        type: DataTypes.STRING(20),
        defaultValue: "manual",
        validate: { isIn: [PLANNER_SESSION_SOURCES] },
      },
    },
    modelOptions("planner_sessions"),
  );
};
