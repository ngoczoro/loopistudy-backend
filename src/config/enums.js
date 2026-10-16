/**
 * Canonical enum values shared by migrations, models, and serializers.
 * Keep aligned with frontend contracts.
 */

export const ROLES = ["admin", "student"];

export const USER_STATUSES = ["PENDING", "ACTIVE", "BANNED", "LOCKED"];

export const SUBJECT_DIFFICULTIES = ["Easy", "Medium", "Hard"];

export const PRIORITIES = ["low", "medium", "high"];

export const CONTENT_TYPES = ["note", "file", "link"];

export const FOCUS_SESSION_STATUSES = [
  "running",
  "paused",
  "completed",
  "cancelled",
];

export const PLANNER_SESSION_SOURCES = ["manual", "ics_import", "ai_plan"];

export const QUIZ_SOURCES = ["manual", "ai_generated"];

export const GOAL_UNITS = ["hrs", "tasks", "chapters", "min"];

/** Legacy DB CHECK may still be daily|weekly only; API allows monthly for forward compat. */
export const GOAL_PERIODS = ["daily", "weekly", "monthly"];

export const GOAL_METRIC_KEYS = [
  "focus_seconds",
  "completed_sessions",
  "tasks_completed",
  "streak_days",
  "manual",
];

export const COMPUTED_GOAL_METRICS = [
  "focus_seconds",
  "completed_sessions",
  "tasks_completed",
  "streak_days",
];

export const OTP_TYPES = ["REGISTER", "FORGOT_PASSWORD"];

export const NOTIFICATION_AUDIENCES = ["user", "admin"];

export const NOTIFICATION_TYPES = [
  "reminder",
  "deadline",
  "ai",
  "streak",
  "session",
  "moderation",
];

export const VIOLATION_TYPES = ["spam", "inappropriate", "irrelevant"];

export const VIOLATION_SEVERITIES = ["low", "medium", "high"];

export const AI_REQUEST_TYPES = [
  "quiz_generate",
  "summarize",
  "study_plan",
  "suggest_materials",
  "moderate",
];

export const AI_REQUEST_STATUSES = ["pending", "completed", "failed"];

export const GROUP_MEMBER_ROLES = ["owner", "member"];
