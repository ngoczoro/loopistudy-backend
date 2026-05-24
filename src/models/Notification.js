import { DataTypes } from "sequelize";
import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_TYPES,
} from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineNotificationModel = (sequelize) => {
  return sequelize.define(
    "Notification",
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
      audience: {
        type: DataTypes.STRING(10),
        defaultValue: "user",
        validate: { isIn: [NOTIFICATION_AUDIENCES] },
      },
      type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [NOTIFICATION_TYPES] },
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_read",
      },
      metadata: {
        type: DataTypes.JSONB,
      },
    },
    modelOptions("notifications"),
  );
};
