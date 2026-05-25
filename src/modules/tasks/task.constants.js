export const TASK_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
};

export const TASK_STATUSES = Object.values(TASK_STATUS);

export const TASK_SORT_FIELDS = ["dueDate", "priority", "createdAt"];

export const DEFAULT_UPCOMING_LIMIT = 10;
export const DEFAULT_OVERDUE_LIMIT = 10;

/** Placeholders for future phases — no DB columns yet. */
export const TASK_OPTIONAL_FEATURES = [
  "recurring",
  "tags",
  "estimatedDuration",
];

export const PRIORITY_ORDER = {
  high: 1,
  medium: 2,
  low: 3,
};
