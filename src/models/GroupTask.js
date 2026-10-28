import { DataTypes } from "sequelize";
import { GROUP_TASK_STATUSES } from "../config/enums.js";
import { modelOptions } from "./shared.js";

export const defineGroupTaskModel = (sequelize) => {
  return sequelize.define(
    "GroupTask",
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
      goalId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "goal_id",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(2000),
        allowNull: true,
      },
      assigneeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "assignee_id",
      },
      status: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "todo",
        validate: { isIn: [GROUP_TASK_STATUSES] },
      },
      dueAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "due_at",
      },
      dependsOnTaskId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "depends_on_task_id",
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "created_by",
      },
      lastRemindedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_reminded_at",
      },
    },
    modelOptions("group_tasks"),
  );
};
