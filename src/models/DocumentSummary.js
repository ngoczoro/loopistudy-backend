import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineDocumentSummaryModel = (sequelize) => {
  return sequelize.define(
    "DocumentSummary",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      documentId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: "document_id",
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      keyPoints: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: "key_points",
      },
      learningNotes: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: "learning_notes",
      },
      keywords: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      model: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "created_by",
      },
    },
    modelOptions("document_summaries"),
  );
};
