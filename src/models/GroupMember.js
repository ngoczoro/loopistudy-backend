import { DataTypes } from "sequelize";
import { GROUP_MEMBER_ROLES } from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineGroupMemberModel = (sequelize) => {
  return sequelize.define(
    "GroupMember",
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
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
      },
      role: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "member",
        validate: { isIn: [GROUP_MEMBER_ROLES] },
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "joined_at",
      },
      lastReadAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "last_read_at",
      },
      clearedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "cleared_at",
      },
      pinned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      muted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    modelOptions("study_group_members"),
  );
};
