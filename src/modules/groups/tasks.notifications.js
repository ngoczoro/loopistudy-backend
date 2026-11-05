import sequelize from "../../config/database.js";
import * as notificationService from "../../services/notificationService.js";
import { serializeNotification } from "../../serializers/notificationSerializer.js";
import { emitToRoom, userRoom } from "../../shared/realtime/socket.js";
import * as tasksRepository from "./tasks.repository.js";
import { TASK_ALERT_TIMEZONE, TASK_NOTIFICATION } from "./groups.constants.js";

/** Automated alerts honour the user's settings; direct actions (assign, remind) always go through. */
const PREFERENCE_BY_TYPE = {
  [TASK_NOTIFICATION.DUE_SOON]: "notifyTaskReminders",
  [TASK_NOTIFICATION.OVERDUE]: "notifyDeadlineAlerts",
  [TASK_NOTIFICATION.BLOCKED]: "notifyDeadlineAlerts",
};

const dueFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TASK_ALERT_TIMEZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDue = (value) => (value ? dueFormatter.format(new Date(value)) : null);
const withDue = (text, dueAt) => (dueAt ? `${text} Due ${formatDue(dueAt)}.` : text);

/**
 * @param {string} type one of TASK_NOTIFICATION
 * @param {{ task: object, groupName: string, actorName?: string, assigneeName?: string, blocker?: object, toOwner?: boolean }} ctx
 */
export const buildTaskNotificationContent = (type, ctx) => {
  const { task, groupName } = ctx;

  switch (type) {
    case TASK_NOTIFICATION.ASSIGNED:
      return {
        title: `New task in ${groupName}`,
        body: withDue(`${ctx.actorName ?? "A teammate"} assigned you "${task.title}".`, task.dueAt),
      };
    case TASK_NOTIFICATION.REMINDER:
      return {
        title: `Reminder: ${task.title}`,
        body: withDue(`${ctx.actorName ?? "Your group owner"} reminded you about this task in ${groupName}.`, task.dueAt),
      };
    case TASK_NOTIFICATION.DUE_SOON:
      return {
        title: `Task due soon: ${task.title}`,
        body: ctx.milestoneLabel
          ? `Less than ${ctx.milestoneLabel} left. Due ${formatDue(task.dueAt)} in ${groupName}.`
          : `Due ${formatDue(task.dueAt)} in ${groupName}.`,
      };
    case TASK_NOTIFICATION.OVERDUE:
      return ctx.toOwner
        ? {
            title: `Overdue task in ${groupName}`,
            body: `"${task.title}" assigned to ${ctx.assigneeName ?? "a member"} was due ${formatDue(task.dueAt)}.`,
          }
        : {
            title: `Task overdue: ${task.title}`,
            body: `It was due ${formatDue(task.dueAt)} in ${groupName}.`,
          };
    case TASK_NOTIFICATION.BLOCKED:
      return {
        title: `Task blocked: ${task.title}`,
        body: `It is waiting on "${ctx.blocker.title}", which is overdue in ${groupName}.`,
      };
    default:
      throw new Error(`Unknown group task notification type: ${type}`);
  }
};

const isAllowedByPreferences = (type, preference) => {
  const field = PREFERENCE_BY_TYPE[type];
  return !field || !preference || preference[field] !== false;
};

/**
 * Creates in-app notifications and pushes them to each recipient's socket room.
 * Entries with a `dedupeKey` are sent at most once per (type, task, recipient, key).
 *
 * @param {Array<{ type: string, recipientId: string, task: object, groupId: string, groupName: string, dedupeKey?: string, title: string, body: string }>} entries
 * @returns {Promise<number>} how many notifications were created
 */
export const sendTaskNotifications = async (entries) => {
  if (entries.length === 0) return 0;

  const preferences = await tasksRepository.findPreferences([
    ...new Set(entries.map((entry) => entry.recipientId)),
  ]);
  let sent = 0;

  for (const entry of entries) {
    if (!isAllowedByPreferences(entry.type, preferences.get(entry.recipientId))) continue;

    const notification = await sequelize.transaction(async (transaction) => {
      if (entry.dedupeKey) {
        const claimed = await tasksRepository.claimNotificationSlot(
          {
            type: entry.type,
            taskId: entry.task.id,
            recipientId: entry.recipientId,
            dedupeKey: entry.dedupeKey,
          },
          transaction,
        );
        if (!claimed) return null;
      }

      return notificationService.create(
        entry.recipientId,
        {
          type: entry.type,
          title: entry.title.slice(0, 200),
          body: entry.body,
          metadata: {
            groupId: entry.groupId,
            groupName: entry.groupName,
            taskId: entry.task.id,
          },
        },
        { transaction },
      );
    });

    if (notification) {
      sent += 1;
      emitToRoom(userRoom(entry.recipientId), "notification:new", serializeNotification(notification));
    }
  }

  return sent;
};
