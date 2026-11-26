import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineStudyGroupModel = (sequelize) => {
  return sequelize.define(
    "StudyGroup",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      avatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "avatar_url",
      },
      avatarPublicId: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "avatar_public_id",
      },
      inviteCode: {
        type: DataTypes.STRING(9),
        allowNull: false,
        unique: true,
        field: "invite_code",
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "owner_id",
      },
      backupMeetUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "backup_meet_url",
      },
      activeMeetUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "active_meet_url",
      },
      activeMeetBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "active_meet_by",
      },
      activeMeetAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "active_meet_at",
      },
      callStartedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "call_started_at",
      },
      callStartedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "call_started_by",
      },
    },
    modelOptions("study_groups", { paranoid: true }),
  );
};
