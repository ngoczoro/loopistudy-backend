import ApiError from "../../utils/ApiError.js";
import * as groupsRepository from "./groups.repository.js";
import * as tasksRepository from "./tasks.repository.js";
import { getMembershipOrThrow, getOwnerMembershipOrThrow } from "./groups.access.js";
import {
  serializeGoal,
  serializeProgress,
  serializeTask,
  summarizeGroupProgress,
} from "./tasks.serializer.js";
import { buildTaskNotificationContent, sendTaskNotifications } from "./tasks.notifications.js";
import {
  GROUP_ROLE,
  TASK_NOTIFICATION,
  TASK_REMIND_COOLDOWN_MS,
  TASK_STATUS,
} from "./groups.constants.js";

const TASK_CONTENT_FIELDS = ["title", "description", "assigneeId", "dueAt", "dependsOnTaskId", "goalId"];

const toDateOrNull = (value) => (value ? new Date(value) : null);
const toTime = (value) => (value ? new Date(value).getTime() : null);
const optionalText = (value) => {
  if (value === undefined) return undefined;
  const trimmed = value == null ? "" : String(value).trim();
  return trimmed || null;
};

const isOwner = (membership) => membership.role === GROUP_ROLE.OWNER;

// ---------- Views ----------

const loadGroupTasks = (groupId) => tasksRepository.listTasksByGroupIds([groupId]);

const goalView = async (groupId, goalId) => {
  const [goal, tasks] = await Promise.all([
    tasksRepository.findGoalWithCreator(goalId),
    loadGroupTasks(groupId),
  ]);
  return serializeGoal(goal, tasks, Date.now());
};

const taskView = async (groupId, taskId) => {
  const [task, groupTasks] = await Promise.all([
    tasksRepository.findTaskWithUsers(taskId),
    loadGroupTasks(groupId),
  ]);
  const tasksById = new Map(groupTasks.map((item) => [item.id, item]));
  return serializeTask(task, tasksById, Date.now());
};

/** @returns {Promise<Map<string, object>>} groupId → compact progress block */
export const getProgressSummaries = async (groupIds) => {
  const [goals, tasks] = await Promise.all([
    tasksRepository.listGoalsByGroupIds(groupIds),
    tasksRepository.listTasksByGroupIds(groupIds),
  ]);
  const now = Date.now();

  return new Map(
    groupIds.map((groupId) => [
      groupId,
      summarizeGroupProgress(
        goals.filter((goal) => goal.groupId === groupId),
        tasks.filter((task) => task.groupId === groupId),
        now,
      ),
    ]),
  );
};

export const getProgress = async (userId, groupId) => {
  await getMembershipOrThrow(groupId, userId);
  const [goals, tasks, members] = await Promise.all([
    tasksRepository.listGoals(groupId),
    loadGroupTasks(groupId),
    groupsRepository.listMembers(groupId),
  ]);
  return serializeProgress(groupId, goals, tasks, members, Date.now());
};

// ---------- Goals ----------

const assertGoalRange = (startDate, endDate) => {
  if (!(toTime(endDate) > toTime(startDate))) {
    throw ApiError.badRequest("Ngày kết thúc phải sau ngày bắt đầu.");
  }
};

export const listGoals = async (userId, groupId) => {
  await getMembershipOrThrow(groupId, userId);
  const [goals, tasks] = await Promise.all([
    tasksRepository.listGoals(groupId),
    loadGroupTasks(groupId),
  ]);
  const now = Date.now();
  return goals.map((goal) => serializeGoal(goal, tasks, now));
};

export const createGoal = async (userId, groupId, payload) => {
  await getOwnerMembershipOrThrow(groupId, userId);
  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);
  assertGoalRange(startDate, endDate);

  const goal = await tasksRepository.createGoal({
    groupId,
    title: payload.title.trim(),
    description: optionalText(payload.description) ?? null,
    startDate,
    endDate,
    createdBy: userId,
  });
  return goalView(groupId, goal.id);
};

export const updateGoal = async (userId, groupId, goalId, payload) => {
  await getOwnerMembershipOrThrow(groupId, userId);
  const goal = await tasksRepository.findGoal(groupId, goalId);
  if (!goal) throw ApiError.notFound("Không tìm thấy mục tiêu.");

  const changes = {};
  if (payload.title !== undefined) changes.title = payload.title.trim();
  const description = optionalText(payload.description);
  if (description !== undefined) changes.description = description;
  if (payload.startDate !== undefined) changes.startDate = new Date(payload.startDate);
  if (payload.endDate !== undefined) changes.endDate = new Date(payload.endDate);

  const startDate = changes.startDate ?? goal.startDate;
  const endDate = changes.endDate ?? goal.endDate;
  if (changes.startDate || changes.endDate) {
    assertGoalRange(startDate, endDate);
    const outside = await tasksRepository.findTaskOutsideRange(goal.id, startDate, endDate);
    if (outside) {
      throw ApiError.badRequest(
        `Khoảng thời gian mới không bao gồm hạn của task "${outside.title}".`,
      );
    }
  }

  await tasksRepository.updateGoal(goal, changes);
  return goalView(groupId, goal.id);
};

export const deleteGoal = async (userId, groupId, goalId) => {
  await getOwnerMembershipOrThrow(groupId, userId);
  const goal = await tasksRepository.findGoal(groupId, goalId);
  if (!goal) throw ApiError.notFound("Không tìm thấy mục tiêu.");
  await tasksRepository.deleteGoal(goal);
};

// ---------- Tasks ----------

const assertNoDependencyCycle = async (groupId, taskId, dependsOnTaskId) => {
  if (!taskId) return;
  const edges = await tasksRepository.listDependencyEdges(groupId);
  const next = new Map(edges.map((edge) => [edge.id, edge.dependsOnTaskId]));
  const visited = new Set();

  for (let cursor = dependsOnTaskId; cursor; cursor = next.get(cursor)) {
    if (cursor === taskId) {
      throw ApiError.badRequest("Phụ thuộc này tạo thành vòng lặp giữa các task.");
    }
    if (visited.has(cursor)) return;
    visited.add(cursor);
  }
};

/** Resolves the task's effective references after `input` is applied and validates them. */
const validateTaskRefs = async (groupId, existingTask, input) => {
  const taskId = existingTask?.id ?? null;

  if (input.assigneeId) {
    const assignee = await groupsRepository.findMembership(groupId, input.assigneeId);
    if (!assignee) throw ApiError.badRequest("Người được giao phải là thành viên nhóm.");
  }

  if (input.dependsOnTaskId) {
    if (input.dependsOnTaskId === taskId) {
      throw ApiError.badRequest("Task không thể phụ thuộc vào chính nó.");
    }
    const prerequisite = await tasksRepository.findTask(groupId, input.dependsOnTaskId);
    if (!prerequisite) throw ApiError.badRequest("Task tiền đề không thuộc nhóm này.");
    await assertNoDependencyCycle(groupId, taskId, input.dependsOnTaskId);
  }

  const goalId = input.goalId !== undefined ? input.goalId || null : existingTask?.goalId ?? null;
  const dueAt =
    input.dueAt !== undefined ? toDateOrNull(input.dueAt) : existingTask?.dueAt ?? null;
  if (!goalId) return;

  const goal = await tasksRepository.findGoal(groupId, goalId);
  if (!goal) throw ApiError.badRequest("Mục tiêu không thuộc nhóm này.");
  if (dueAt && (toTime(dueAt) < toTime(goal.startDate) || toTime(dueAt) > toTime(goal.endDate))) {
    throw ApiError.badRequest("Hạn của task phải nằm trong khoảng thời gian của mục tiêu.");
  }
};

/** Never lets a notification problem fail the request that triggered it. */
const notifyAssignment = async ({ task, groupId, groupName, actorId }) => {
  if (!task.assigneeId || task.assigneeId === actorId || task.status === TASK_STATUS.DONE) return;
  try {
    const actor = await tasksRepository.findUserSummary(actorId);
    await sendTaskNotifications([
      {
        type: TASK_NOTIFICATION.ASSIGNED,
        recipientId: task.assigneeId,
        task,
        groupId,
        groupName,
        ...buildTaskNotificationContent(TASK_NOTIFICATION.ASSIGNED, {
          task,
          groupName,
          actorName: actor?.fullName,
        }),
      },
    ]);
  } catch (error) {
    console.error("Failed to send task assignment notification:", error.message);
  }
};

export const listTasks = async (userId, groupId, query = {}) => {
  await getMembershipOrThrow(groupId, userId);
  const [tasks, groupTasks] = await Promise.all([
    tasksRepository.listTasks(groupId, query),
    loadGroupTasks(groupId),
  ]);
  const tasksById = new Map(groupTasks.map((task) => [task.id, task]));
  const now = Date.now();
  return tasks.map((task) => serializeTask(task, tasksById, now));
};

export const createTask = async (userId, groupId, payload) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  await validateTaskRefs(groupId, null, payload);

  const task = await tasksRepository.createTask({
    groupId,
    goalId: payload.goalId || null,
    title: payload.title.trim(),
    description: optionalText(payload.description) ?? null,
    assigneeId: payload.assigneeId || null,
    status: TASK_STATUS.TODO,
    dueAt: toDateOrNull(payload.dueAt),
    dependsOnTaskId: payload.dependsOnTaskId || null,
    createdBy: userId,
  });

  await notifyAssignment({ task, groupId, groupName: membership.group.name, actorId: userId });
  return taskView(groupId, task.id);
};

export const updateTask = async (userId, groupId, taskId, payload) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const task = await tasksRepository.findTask(groupId, taskId);
  if (!task) throw ApiError.notFound("Không tìm thấy task.");

  const touchesContent = TASK_CONTENT_FIELDS.some((field) => payload[field] !== undefined);
  if (touchesContent && !isOwner(membership) && task.createdBy !== userId) {
    throw ApiError.forbidden("Bạn chỉ sửa được task do mình tạo.");
  }
  if (payload.status !== undefined && !isOwner(membership) && task.assigneeId !== userId) {
    throw ApiError.forbidden("Chỉ trưởng nhóm hoặc người được giao mới đổi được trạng thái task.");
  }

  await validateTaskRefs(groupId, task, payload);

  const previousAssigneeId = task.assigneeId;
  const changes = {};
  if (payload.title !== undefined) changes.title = payload.title.trim();
  const description = optionalText(payload.description);
  if (description !== undefined) changes.description = description;
  if (payload.assigneeId !== undefined) changes.assigneeId = payload.assigneeId || null;
  if (payload.dueAt !== undefined) changes.dueAt = toDateOrNull(payload.dueAt);
  if (payload.dependsOnTaskId !== undefined) changes.dependsOnTaskId = payload.dependsOnTaskId || null;
  if (payload.goalId !== undefined) changes.goalId = payload.goalId || null;
  if (payload.status !== undefined && payload.status !== task.status) {
    changes.status = payload.status;
    changes.completedAt = payload.status === TASK_STATUS.DONE ? new Date() : null;
  }

  await tasksRepository.updateTask(task, changes);

  if (task.assigneeId && task.assigneeId !== previousAssigneeId) {
    await notifyAssignment({ task, groupId, groupName: membership.group.name, actorId: userId });
  }
  return taskView(groupId, task.id);
};

export const deleteTask = async (userId, groupId, taskId) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const task = await tasksRepository.findTask(groupId, taskId);
  if (!task) throw ApiError.notFound("Không tìm thấy task.");
  if (!isOwner(membership) && task.createdBy !== userId) {
    throw ApiError.forbidden("Bạn chỉ xóa được task do mình tạo.");
  }
  await tasksRepository.deleteTask(task);
};

export const remindTask = async (userId, groupId, taskId) => {
  const membership = await getOwnerMembershipOrThrow(groupId, userId);
  const task = await tasksRepository.findTask(groupId, taskId);
  if (!task) throw ApiError.notFound("Không tìm thấy task.");
  if (!task.assigneeId) throw ApiError.badRequest("Task chưa có người được giao.");
  if (task.status === TASK_STATUS.DONE) throw ApiError.badRequest("Task đã hoàn thành.");

  const now = new Date();
  const claimed = await tasksRepository.claimReminder(
    task.id,
    now,
    new Date(now.getTime() - TASK_REMIND_COOLDOWN_MS),
  );
  if (!claimed) {
    throw new ApiError(429, "Task này đã được nhắc trong 24 giờ qua.");
  }

  const groupName = membership.group.name;
  const actor = await tasksRepository.findUserSummary(userId);
  await sendTaskNotifications([
    {
      type: TASK_NOTIFICATION.REMINDER,
      recipientId: task.assigneeId,
      task,
      groupId,
      groupName,
      ...buildTaskNotificationContent(TASK_NOTIFICATION.REMINDER, {
        task,
        groupName,
        actorName: actor?.fullName,
      }),
    },
  ]);

  return {
    remindedAt: now.toISOString(),
    nextAllowedAt: new Date(now.getTime() + TASK_REMIND_COOLDOWN_MS).toISOString(),
  };
};

export const unassignMember = (groupId, userId) =>
  tasksRepository.unassignMemberTasks(groupId, userId);
