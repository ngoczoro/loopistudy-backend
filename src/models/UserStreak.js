import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineUserStreakModel = (sequelize) => {
  return sequelize.define(
    "UserStreak",
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        field: "user_id",
      },
      currentStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "current_streak",
      },
      longestStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "longest_streak",
      },
      lastStudyDate: {
        type: DataTypes.DATEONLY,
        field: "last_study_date",
      },
    },
    modelOptions("user_streaks"),
  );
};
