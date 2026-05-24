import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineBlockedSlotModel = (sequelize) => {
  return sequelize.define(
    "BlockedSlot",
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
      dayOfWeek: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        field: "day_of_week",
        validate: { min: 0, max: 6 },
      },
      hour: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        validate: { min: 0, max: 23 },
      },
    },
    modelOptions("blocked_slots"),
  );
};
