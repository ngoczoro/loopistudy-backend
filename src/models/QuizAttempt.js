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
      answers: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "total_questions",
      },
      correctCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "correct_count",
      },
      scorePercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: "score_percentage",
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "started_at",
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "submitted_at",
      },
      durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "duration_seconds",
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
        allowNull: true,
        field: "time_spent_seconds",
      },
    },
    modelOptions("quiz_attempts"),
  );
};
