import { DataTypes } from "sequelize";
import { QUIZ_SOURCES } from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineQuizModel = (sequelize) => {
  return sequelize.define(
    "Quiz",
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
      questions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      source: {
        type: DataTypes.STRING(20),
        defaultValue: "manual",
        validate: { isIn: [QUIZ_SOURCES] },
      },
    },
    modelOptions("quizzes", { paranoid: true }),
  );
};
