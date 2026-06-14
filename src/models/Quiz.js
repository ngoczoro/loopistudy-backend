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
      sourceDocumentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "source_document_id",
      },
      aiModel: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "ai_model",
      },
      generationDifficulty: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: "generation_difficulty",
      },
      generationQuestionCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "generation_question_count",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    modelOptions("quizzes", { paranoid: true }),
  );
};
