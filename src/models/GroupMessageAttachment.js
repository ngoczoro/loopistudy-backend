import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineGroupMessageAttachmentModel = (sequelize) => {
  return sequelize.define(
    "GroupMessageAttachment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      messageId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "message_id",
      },
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "group_id",
      },
      kind: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: { isIn: [["image", "file"]] },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: "mime_type",
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      publicId: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "public_id",
      },
      position: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
    },
    modelOptions("group_message_attachments"),
  );
};
