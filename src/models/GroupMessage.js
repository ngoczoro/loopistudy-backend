import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineGroupMessageModel = (sequelize) => {
  return sequelize.define(
    "GroupMessage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "group_id",
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "sender_id",
      },
      content: {
        type: DataTypes.STRING(2000),
        allowNull: false,
        defaultValue: "",
      },
      // "text" (written by a member), or "call_started" / "call_ended" / "meet" (posted by calls).
      kind: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "text",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    modelOptions("group_messages"),
  );
};
