import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineSavedLearningResourceModel = (sequelize) =>
  sequelize.define(
    "SavedLearningResource",
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
      resourceId: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "resource_id",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      provider: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      topics: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      sourceQuery: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "source_query",
      },
    },
    modelOptions("saved_learning_resources"),
  );
