import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineAiResourceRecommendationHistoryModel = (sequelize) =>
  sequelize.define(
    "AiResourceRecommendationHistory",
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
      query: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      normalizedQuery: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "normalized_query",
      },
      resources: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      learningPath: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "learning_path",
      },
      model: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      lastViewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_viewed_at",
      },
    },
    modelOptions("ai_resource_recommendation_histories"),
  );
