import cron from "node-cron";
import * as tasksRepository from "./tasks.repository.js";
import { getBlockingTask } from "./tasks.serializer.js";
import { buildTaskNotificationContent, sendTaskNotifications } from "./tasks.notifications.js";
import {
  TASK_ALERT_CRON,
  TASK_ALERT_TIMEZONE,
  TASK_DUE_SOON_MILESTONES,
  TASK_NOTIFICATION,
  TASK_OVERDUE_ALERT_HOUR,
} from "./groups.constants.js";

const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TASK_ALERT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const localHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TASK_ALERT_TIMEZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

const entryFor = (type, recipientId, task, dedupeKey, ctx = {}) => {
  const groupName = task.group.name;
  return {
    type,
    recipientId,
    task,
    groupId: task.groupId,
    groupName,
    dedupeKey,
    ...buildTaskNotificationContent(type, { task, groupName, ...ctx }),
  };
};

/**
 * The tightest milestone the remaining time falls into. A milestone that had already
 * passed when the task was created is skipped, so a late task only gets the next one.
 */
const pickDueSoonMilestone = (task, dueMs, nowMs) => {
  const remaining = dueMs - nowMs;
  if (remaining <= 0) return null;

  const milestone = [...TASK_DUE_SOON_MILESTONES]
    .reverse()
    .find((item) => remaining <= item.windowMs);
  if (!milestone) return null;

  const createdMs = task.createdAt ? new Date(task.createdAt).getTime() : 0;
  return createdMs <= dueMs - milestone.windowMs ? milestone : null;
};

/** Pure: which notifications a single open task should produce at `now`. */
export const collectTaskAlerts = (task, now) => {
  const nowMs = now.getTime();
  const localDate = localDateFormatter.format(now);
  const overdueWindowOpen = Number(localHourFormatter.format(now)) >= TASK_OVERDUE_ALERT_HOUR;
  const entries = [];
  const dueMs = task.dueAt ? new Date(task.dueAt).getTime() : null;

  const milestone = dueMs !== null ? pickDueSoonMilestone(task, dueMs, nowMs) : null;
  if (milestone) {
    // Keyed by deadline + milestone: moving the deadline re-arms both warnings.
    entries.push(
      entryFor(
        TASK_NOTIFICATION.DUE_SOON,
        task.assigneeId,
        task,
        `due:${new Date(dueMs).toISOString()}:${milestone.key}`,
        { milestoneLabel: milestone.label },
      ),
    );
  }

  if (dueMs !== null && dueMs <= nowMs && overdueWindowOpen) {
    const dedupeKey = `day:${localDate}`;
    entries.push(entryFor(TASK_NOTIFICATION.OVERDUE, task.assigneeId, task, dedupeKey));
    if (task.group.ownerId && task.group.ownerId !== task.assigneeId) {
      entries.push(
        entryFor(TASK_NOTIFICATION.OVERDUE, task.group.ownerId, task, dedupeKey, {
          toOwner: true,
          assigneeName: task.assignee?.fullName,
        }),
      );
    }
  }

  const blocker = getBlockingTask(task, task.dependsOn, nowMs);
  if (blocker) {
    // Same blocker + same blocker deadline = same situation; only a new block re-notifies.
    const blockerDue = new Date(blocker.dueAt).toISOString();
    entries.push(
      entryFor(TASK_NOTIFICATION.BLOCKED, task.assigneeId, task, `blocker:${blocker.id}:${blockerDue}`, {
        blocker,
      }),
    );
  }

  return entries;
};

export const runTaskAlerts = async (now = new Date()) => {
  const tasks = await tasksRepository.listOpenAssignedTasks();
  const entries = tasks.flatMap((task) => collectTaskAlerts(task, now));
  return sendTaskNotifications(entries);
};

let scheduled = null;

const runSafely = async () => {
  try {
    const sent = await runTaskAlerts();
    if (sent > 0) console.log(`✓ Group task alerts: ${sent} notification(s) sent`);
  } catch (error) {
    console.error("✗ Group task alerts failed:", error.message);
  }
};

/** Starts the hourly job and runs one pass right away to catch up after downtime. */
export const startTaskAlertScheduler = () => {
  if (scheduled || process.env.GROUP_TASK_ALERTS_ENABLED === "false") return;

  scheduled = cron.schedule(TASK_ALERT_CRON, runSafely, {
    name: "group-task-alerts",
    timezone: TASK_ALERT_TIMEZONE,
    noOverlap: true,
  });
  runSafely();
};
