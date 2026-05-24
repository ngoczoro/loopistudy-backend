import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineUserBadgeModel = (sequelize) => {
  return sequelize.define(
    "UserBadge",
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        field: "user_id",
      },
      badgeId: {
        type: DataTypes.UUID,
        primaryKey: true,
        field: "badge_id",
      },
      earnedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "earned_at",
      },
    },
    {
      ...modelOptions("user_badges"),
      timestamps: false,
    },
  );
};
