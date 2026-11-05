export const GROUP_ROLE = {
  OWNER: "owner",
  MEMBER: "member",
};

export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_PART_LENGTH = 4;
export const INVITE_CODE_MAX_ATTEMPTS = 10;

export const GROUP_AVATAR_FIELD = "avatar";
export const GROUP_AVATAR_FOLDER = "loopi-study/groups";

export const CHAT_FILES_FIELD = "files";
export const CHAT_MAX_FILES = 5;
export const CHAT_MAX_CONTENT_LENGTH = 2000;
export const CHAT_ATTACHMENT_FOLDER = "loopi-study/group-chat";
export const CHAT_PAGE_DEFAULT_LIMIT = 30;
export const CHAT_PAGE_MAX_LIMIT = 100;
export const SHARED_TYPES = ["media", "file", "link"];
export const SHARED_DEFAULT_LIMIT = 20;
export const SHARED_MAX_LIMIT = 100;
/** How many link-bearing messages to scan when listing shared links. */
export const SHARED_LINK_SCAN_LIMIT = 300;

export const RESOURCE_TYPES = ["link", "note", "file"];
export const RESOURCE_NOTE_EXCERPT_MAX = 5000;

export const TASK_STATUS = {
  TODO: "todo",
  DOING: "doing",
  DONE: "done",
};
export const TASK_REMIND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Largest window first. Each milestone is sent once per deadline. */
export const TASK_DUE_SOON_MILESTONES = [
  { key: "12h", label: "12 hours", windowMs: 12 * 60 * 60 * 1000 },
  { key: "2h", label: "2 hours", windowMs: 2 * 60 * 60 * 1000 },
];
export const GOAL_UNIT = "tasks";

export const TASK_NOTIFICATION = {
  ASSIGNED: "group_task_assigned",
  REMINDER: "group_task_reminder",
  DUE_SOON: "group_task_due_soon",
  OVERDUE: "group_task_overdue",
  BLOCKED: "group_task_blocked",
};

/** Hourly, so a task due within the day still gets its "due soon" warning in time. */
export const TASK_ALERT_CRON = "5 * * * *";
export const TASK_ALERT_TIMEZONE = process.env.GROUP_TASK_ALERT_TIMEZONE || "Asia/Ho_Chi_Minh";
/** Overdue alerts repeat daily; hold them until this local hour so nobody is pinged at night. */
export const TASK_OVERDUE_ALERT_HOUR = 8;

export const DEFAULT_GROUP_PROGRESS = Object.freeze({
  goalPercent: null,
  overdueTaskCount: 0,
  blockedTaskCount: 0,
  isBehind: false,
});
