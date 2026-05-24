import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineQuizAttemptModel = (sequelize) => {
  return sequelize.define(
    "QuizAttempt",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      quizId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "quiz_id",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
      },
      score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      total: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      timeSpentSeconds: {
        type: DataTypes.INTEGER,
        field: "time_spent_seconds",
      },
      answers: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    modelOptions("quiz_attempts"),
  );
};
