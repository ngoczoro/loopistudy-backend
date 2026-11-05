import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineAssistantConversationModel = (sequelize) => {
  return sequelize.define(
    "AssistantConversation",
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
      title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "New chat",
      },
      titleEdited: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "title_edited",
      },
      scope: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: { type: "all" },
      },
    },
    modelOptions("assistant_conversations"),
  );
};
