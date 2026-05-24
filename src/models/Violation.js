import { DataTypes } from "sequelize";
import {
  VIOLATION_SEVERITIES,
  VIOLATION_TYPES,
} from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineViolationModel = (sequelize) => {
  return sequelize.define(
    "Violation",
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
      contentTitle: {
        type: DataTypes.STRING(200),
        field: "content_title",
      },
      contentType: {
        type: DataTypes.STRING(20),
        field: "content_type",
      },
      type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [VIOLATION_TYPES] },
      },
      severity: {
        type: DataTypes.STRING(10),
        defaultValue: "medium",
        validate: { isIn: [VIOLATION_SEVERITIES] },
      },
      resolved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      resolvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "resolved_by",
      },
      resolvedAt: {
        type: DataTypes.DATE,
        field: "resolved_at",
      },
      detectedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "detected_at",
      },
    },
    modelOptions("violations"),
  );
};
