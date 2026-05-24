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

/** @deprecated Use enums from config/enums.js for validation lists */
export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
};

export const USER_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  BANNED: "BANNED",
  LOCKED: "LOCKED",
};

export const SUBJECT_DIFFICULTY = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const CONTENT_TYPE = {
  NOTE: "note",
  FILE: "file",
  LINK: "link",
};

export const FOCUS_SESSION_STATUS = {
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
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
  WORK_DURATION: 25,
  BREAK_DURATION: 5,
  LONG_BREAK_DURATION: 15,
  SESSIONS_BEFORE_LONG_BREAK: 4,
};
