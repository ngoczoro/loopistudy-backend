import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineBadgeModel = (sequelize) => {
  return sequelize.define(
    "Badge",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
    },
    modelOptions("badges"),
  );
};
