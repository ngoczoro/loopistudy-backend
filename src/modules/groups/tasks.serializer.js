import { serializeUserSummary } from "./groups.serializer.js";
import { DEFAULT_GROUP_PROGRESS, GOAL_UNIT, TASK_STATUS } from "./groups.constants.js";

const toIso = (value) => (value ? new Date(value).toISOString() : null);
const toTime = (value) => (value ? new Date(value).getTime() : null);

export const isTaskOverdue = (task, now) =>
  task.status !== TASK_STATUS.DONE && task.dueAt != null && toTime(task.dueAt) < now;

/** Blocked = not done, and the prerequisite is itself overdue and unfinished. */
export const getBlockingTask = (task, dependsOn, now) => {
  if (task.status === TASK_STATUS.DONE || !dependsOn) return null;
  return isTaskOverdue(dependsOn, now) ? dependsOn : null;
};

export const serializeTask = (task, tasksById, now) => {
  const blocker = getBlockingTask(task, tasksById.get(task.dependsOnTaskId), now);

  return {
    id: task.id,
    groupId: task.groupId,
    goalId: task.goalId ?? null,
    title: task.title,
    description: task.description ?? "",
    assignee: serializeUserSummary(task.assignee),
    status: task.status,
    effectiveStatus: blocker ? "blocked" : task.status,
    dueAt: toIso(task.dueAt),
    dependsOnTaskId: task.dependsOnTaskId ?? null,
    isOverdue: isTaskOverdue(task, now),
    isBlocked: Boolean(blocker),
    blockedBy: blocker ? { id: blocker.id, title: blocker.title } : null,
    completedAt: toIso(task.completedAt),
    createdBy: serializeUserSummary(task.creator),
    createdAt: toIso(task.createdAt),
    lastRemindedAt: toIso(task.lastRemindedAt),
  };
};

const goalMetrics = (goal, tasks, now) => {
  const linked = tasks.filter((task) => task.goalId === goal.id);
  const targetValue = linked.length;
  const currentValue = linked.filter((task) => task.status === TASK_STATUS.DONE).length;
  const percentComplete =
    targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;

  const start = toTime(goal.startDate);
  const end = toTime(goal.endDate);
  const timeElapsedPercent =
    end > start
      ? Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
      : 100;

  return {
    targetValue,
    currentValue,
    percentComplete,
    timeElapsedPercent,
    isBehind: percentComplete < 100 && percentComplete < timeElapsedPercent,
  };
};

export const serializeGoal = (goal, tasks, now) => ({
  id: goal.id,
  groupId: goal.groupId,
  title: goal.title,
  description: goal.description ?? "",
  unit: GOAL_UNIT,
  startDate: toIso(goal.startDate),
  endDate: toIso(goal.endDate),
  ...goalMetrics(goal, tasks, now),
  createdBy: serializeUserSummary(goal.creator),
  createdAt: toIso(goal.createdAt),
});

/**
 * @param {object[]} goals GroupGoal rows of one group
 * @param {object[]} tasks GroupTask rows of the same group
 * @param {object[]} members GroupMember rows with `user` included
 */
export const serializeProgress = (groupId, goals, tasks, members, now) => {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const goalViews = goals.map((goal) => ({ id: goal.id, title: goal.title, ...goalMetrics(goal, tasks, now) }));
  const overdue = tasks.filter((task) => isTaskOverdue(task, now)).length;

  return {
    groupId,
    goals: goalViews.map(({ id, title, percentComplete, timeElapsedPercent, isBehind }) => ({
      id,
      title,
      percentComplete,
      timeElapsedPercent,
      isBehind,
    })),
    tasks: {
      total: tasks.length,
      done: tasks.filter((task) => task.status === TASK_STATUS.DONE).length,
      overdue,
      blocked: tasks.filter((task) => getBlockingTask(task, tasksById.get(task.dependsOnTaskId), now))
        .length,
    },
    members: members.map((member) => {
      const assigned = tasks.filter((task) => task.assigneeId === member.userId);
      return {
        userId: member.userId,
        fullName: member.user?.fullName ?? null,
        avatarUrl: member.user?.avatarUrl ?? null,
        assigned: assigned.length,
        done: assigned.filter((task) => task.status === TASK_STATUS.DONE).length,
        overdue: assigned.filter((task) => isTaskOverdue(task, now)).length,
      };
    }),
    isBehind: goalViews.some((goal) => goal.isBehind) || overdue > 0,
  };
};

/** The compact `progress` block embedded in every Group view. */
export const summarizeGroupProgress = (goals, tasks, now) => {
  if (goals.length === 0 && tasks.length === 0) return { ...DEFAULT_GROUP_PROGRESS };

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const metrics = goals.map((goal) => goalMetrics(goal, tasks, now));
  const overdueTaskCount = tasks.filter((task) => isTaskOverdue(task, now)).length;

  return {
    goalPercent: metrics.length
      ? Math.round(metrics.reduce((sum, item) => sum + item.percentComplete, 0) / metrics.length)
      : null,
    overdueTaskCount,
    blockedTaskCount: tasks.filter((task) =>
      getBlockingTask(task, tasksById.get(task.dependsOnTaskId), now),
    ).length,
    isBehind: metrics.some((item) => item.isBehind) || overdueTaskCount > 0,
  };
};
