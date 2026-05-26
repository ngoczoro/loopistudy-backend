import {
  COMPUTED_GOAL_METRICS,
  GOAL_METRIC_KEYS,
  GOAL_PERIODS,
} from "../../config/enums.js";

export { COMPUTED_GOAL_METRICS, GOAL_METRIC_KEYS, GOAL_PERIODS };

/** Stored on row; v2 windows use UTC dates (see goals.periodUtils). */
export const DEFAULT_GOAL_TIMEZONE = "UTC";

export const GOAL_STATUSES = {
  ACTIVE: "active",
  COMPLETED: "completed",
  PAUSED: "paused",
};

export const LEGACY_UNIT_TO_METRIC = {
  hrs: "focus_seconds",
  min: "focus_seconds",
  tasks: "tasks_completed",
  chapters: "manual",
};
