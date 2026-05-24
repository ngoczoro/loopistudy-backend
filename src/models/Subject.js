import { DataTypes } from "sequelize";
import {
  PRIORITY,
  SUBJECT_DIFFICULTY,
} from "../config/constants.js";
import { modelOptions } from "./shared.js";

export const defineSubjectModel = (sequelize) => {
  return sequelize.define(
    "Subject",
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
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      credits: {
        type: DataTypes.SMALLINT,
      },
      difficulty: {
        type: DataTypes.STRING(10),
        validate: {
          isIn: [
            [
              SUBJECT_DIFFICULTY.EASY,
              SUBJECT_DIFFICULTY.MEDIUM,
              SUBJECT_DIFFICULTY.HARD,
            ],
          ],
        },
      },
      examDate: {
        type: DataTypes.DATEONLY,
        field: "exam_date",
      },
      color: {
        type: DataTypes.STRING(30),
      },
      priority: {
        type: DataTypes.STRING(10),
        validate: {
          isIn: [[PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH]],
        },
      },
      requiredHoursPerWeek: {
        type: DataTypes.DECIMAL(4, 1),
        field: "required_hours_per_week",
      },
      progress: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
    },
    modelOptions("subjects", { paranoid: true }),
  );
};
