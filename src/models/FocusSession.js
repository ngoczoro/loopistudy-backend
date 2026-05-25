import { DataTypes } from "sequelize";
import { FOCUS_SESSION_STATUS } from "../config/constants.js";
import { modelOptions } from "./shared.js";

export const defineFocusSessionModel = (sequelize) => {
  return sequelize.define(
    "FocusSession",
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
      plannerSessionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "planner_session_id",
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: FOCUS_SESSION_STATUS.RUNNING,
        validate: { isIn: [Object.values(FOCUS_SESSION_STATUS)] },
      },
      sessionNumber: {
        type: DataTypes.SMALLINT,
        defaultValue: 1,
        field: "session_number",
      },
      plannedWorkMinutes: {
        type: DataTypes.INTEGER,
        field: "planned_work_minutes",
      },
      plannedBreakMinutes: {
        type: DataTypes.INTEGER,
        field: "planned_break_minutes",
      },
      actualWorkMinutes: {
        type: DataTypes.INTEGER,
        field: "actual_work_minutes",
      },
      startedAt: {
        type: DataTypes.DATE,
        field: "started_at",
      },
      pausedAt: {
        type: DataTypes.DATE,
        field: "paused_at",
      },
      totalPausedSeconds: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "total_paused_seconds",
      },
      completedAt: {
        type: DataTypes.DATE,
        field: "completed_at",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      currentPhase: {
        type: DataTypes.STRING(10),
        defaultValue: "work",
        field: "current_phase",
        validate: { isIn: [["work", "break"]] },
      },
      phaseEndsAt: {
        type: DataTypes.DATE,
        field: "phase_ends_at",
      },
      remainingSeconds: {
        type: DataTypes.INTEGER,
        field: "remaining_seconds",
      },
      workElapsedSeconds: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "work_elapsed_seconds",
      },
    },
    modelOptions("focus_sessions"),
  );
};
