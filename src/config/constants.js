export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export const ROLES = {
  USER: "user",
  ADMIN: "admin",
};

export const USER_STATUS = {
  ACTIVE: "active",
  WARNED: "warned",
  BANNED: "banned",
  INACTIVE: "inactive",
};

export const SUBJECT_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

export const DIFFICULTY_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

export const SESSION_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const NOTIFICATION_TYPES = {
  REMINDER: "reminder",
  ALERT: "alert",
  ACHIEVEMENT: "achievement",
  WARNING: "warning",
  ANNOUNCEMENT: "announcement",
};

export const ACHIEVEMENT_TYPES = {
  STUDY_HOURS: "study_hours",
  STREAK: "streak",
  QUIZ_SCORE: "quiz_score",
  NOTES: "notes",
  SUBJECTS: "subjects",
};

export const GOAL_TYPES = {
  STUDY_HOURS: "study_hours",
  STREAK: "streak",
  SUBJECT_COMPLETION: "subject_completion",
  QUIZ_SCORE: "quiz_score",
};

export const GOAL_PERIODS = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

export const JWT_EXPIRY = {
  ACCESS: "15m",
  REFRESH: "7d",
};

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

export const POMODORO = {
  WORK_DURATION: 25, // minutes
  BREAK_DURATION: 5, // minutes
  LONG_BREAK_DURATION: 15, // minutes
  SESSIONS_BEFORE_LONG_BREAK: 4,
};

export const AI_PLAN = {
  SESSION_DURATION: 90, // minutes
  BREAK_DURATION: 120, // 2 hours between sessions
};
