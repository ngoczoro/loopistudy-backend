import { DataTypes } from "sequelize";
import { GOAL_METRIC_KEYS, GOAL_PERIODS, GOAL_UNITS } from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineStudyGoalModel = (sequelize) => {
  return sequelize.define(
    "StudyGoal",
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
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      targetValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "target_value",
      },
      currentValue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: "current_value",
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [GOAL_UNITS] },
      },
      period: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [GOAL_PERIODS] },
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      metricKey: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "manual",
        field: "metric_key",
        validate: { isIn: [GOAL_METRIC_KEYS] },
      },
      timezone: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "UTC",
      },
    },
    modelOptions("study_goals"),
  );
};
