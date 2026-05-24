import { DataTypes } from "sequelize";
import { PRIORITY } from "../config/constants.js";
import { modelOptions } from "./shared.js";

export const defineTaskModel = (sequelize) => {
  return sequelize.define(
    "Task",
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
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      priority: {
        type: DataTypes.STRING(10),
        defaultValue: PRIORITY.MEDIUM,
        validate: {
          isIn: [[PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH]],
        },
      },
      taskDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "task_date",
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    modelOptions("tasks"),
  );
};
