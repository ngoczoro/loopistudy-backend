import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineSecurityEventModel = (sequelize) => {
  return sequelize.define(
    "SecurityEvent",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      eventType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "event_type",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "user_id",
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: "ip_address",
      },
      endpoint: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      ...modelOptions("security_events"),
      updatedAt: false,
    },
  );
};
