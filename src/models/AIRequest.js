import { DataTypes } from "sequelize";
import {
  AI_REQUEST_STATUSES,
  AI_REQUEST_TYPES,
} from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineAIRequestModel = (sequelize) => {
  return sequelize.define(
    "AIRequest",
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
      contentItemId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "content_item_id",
      },
      subjectId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "subject_id",
      },
      type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [AI_REQUEST_TYPES] },
      },
      inputText: {
        type: DataTypes.TEXT,
        field: "input_text",
      },
      resultJson: {
        type: DataTypes.JSONB,
        field: "result_json",
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: "pending",
        validate: { isIn: [AI_REQUEST_STATUSES] },
      },
      provider: {
        type: DataTypes.STRING(50),
      },
      latencyMs: {
        type: DataTypes.INTEGER,
        field: "latency_ms",
      },
    },
    modelOptions("ai_requests"),
  );
};
