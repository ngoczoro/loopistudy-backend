import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineAssistantMessageModel = (sequelize) => {
  return sequelize.define(
    "AssistantMessage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "conversation_id",
      },
      role: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: { isIn: [["user", "assistant"]] },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      answerStatus: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: "answer_status",
        validate: {
          isIn: [["answered", "not_found", "no_sources"]],
        },
      },
      citations: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    modelOptions("assistant_messages"),
  );
};
