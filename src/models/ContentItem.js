import { DataTypes } from "sequelize";
import { CONTENT_TYPE } from "../config/constants.js";
import { modelOptions } from "./shared.js";

export const defineContentItemModel = (sequelize) => {
  return sequelize.define(
    "ContentItem",
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
      type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          isIn: [[CONTENT_TYPE.NOTE, CONTENT_TYPE.FILE, CONTENT_TYPE.LINK]],
        },
      },
      content: {
        type: DataTypes.TEXT,
      },
      fileUrl: {
        type: DataTypes.TEXT,
        field: "file_url",
      },
      fileMime: {
        type: DataTypes.STRING(100),
        field: "file_mime",
      },
      fileSizeBytes: {
        type: DataTypes.BIGINT,
        field: "file_size_bytes",
      },
      isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_pinned",
      },
    },
    modelOptions("content_items", { paranoid: true }),
  );
};
