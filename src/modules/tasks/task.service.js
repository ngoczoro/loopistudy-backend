import ApiError from "../../utils/ApiError.js";
import { assertOwned } from "../subjects/index.js";
import {
  DEFAULT_OVERDUE_LIMIT,
  DEFAULT_UPCOMING_LIMIT,
  TASK_STATUS,
} from "./task.constants.js";
import * as taskRepository from "./task.repository.js";
import {
  serializeTask,
  serializeTaskList,
  serializeTaskSummary,
} from "./task.serializer.js";

const normalizeSubjectId = (subjectId) => {
  if (
    subjectId === undefined ||
    subjectId === null ||
    subjectId === "" ||
    subjectId === "null"
  ) {
    return null;
  }
  return subjectId;
};

const assertSubjectIfProvided = async (userId, subjectId) => {
  const normalized = normalizeSubjectId(subjectId);
  if (!normalized) return null;

  await assertOwned(userId, normalized);
  return normalized;
};

const getOwnedOrThrow = async (userId, id) => {
  const item = await taskRepository.findByIdAndUserId(id, userId);
  if (!item) {
    throw ApiError.notFound("Task not found or you don't have permission");
  }
  return item;
};

const normalizeListFilters = (query) => {
  const filters = {};

  if (query.subjectId !== undefined) {
    filters.subjectId = normalizeSubjectId(query.subjectId);
  }
  if (query.priority) filters.priority = query.priority;
  if (query.status) filters.status = query.status;
  if (query.completed !== undefined) filters.completed = query.completed;
  if (query.dueDate) filters.dueDate = query.dueDate;
  if (query.dueDateFrom) filters.dueDateFrom = query.dueDateFrom;
  if (query.dueDateTo) filters.dueDateTo = query.dueDateTo;

  return filters;
};

const buildCreatePayload = async (userId, input) => {
  const subjectId = await assertSubjectIfProvided(userId, input.subjectId);

  return {
    userId,
    subjectId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: input.priority,
    taskDate: input.dueDate,
    completed: false,
    completedAt: null,
  };
};

const buildUpdatePayload = async (userId, input) => {
  const payload = {};

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.dueDate !== undefined) payload.taskDate = input.dueDate;
  if (input.subjectId !== undefined) {
    payload.subjectId = await assertSubjectIfProvided(userId, input.subjectId);
  }
  if (input.completed !== undefined) {
    payload.completed = input.completed;
    payload.completedAt = input.completed ? new Date() : null;
  }

  return payload;
};

export const list = async (userId, query, pagination) => {
  const filters = normalizeListFilters(query);
  const { count, rows } = await taskRepository.findAllByUserId(
    userId,
    filters,
    pagination,
    query.sort,
  );

  return {
    items: serializeTaskList(rows),
    total: count,
  };
};

export const getById = async (userId, id) => {
  const item = await getOwnedOrThrow(userId, id);
  return serializeTask(item);
};

export const create = async (userId, input) => {
  const payload = await buildCreatePayload(userId, input);
  const item = await taskRepository.create(payload);
  return serializeTask(item);
};

export const update = async (userId, id, input) => {
  await getOwnedOrThrow(userId, id);
  const payload = await buildUpdatePayload(userId, input);

  if (Object.keys(payload).length === 0) {
    throw ApiError.badRequest("At least one field is required to update");
  }

  const item = await taskRepository.updateById(id, userId, payload);
  if (!item) {
    throw ApiError.notFound("Task not found or you don't have permission");
  }

  return serializeTask(item);
};

export const complete = async (userId, id, completed) => {
  await getOwnedOrThrow(userId, id);

  const item = await taskRepository.updateById(id, userId, {
    completed,
    completedAt: completed ? new Date() : null,
  });

  if (!item) {
    throw ApiError.notFound("Task not found or you don't have permission");
  }

  return serializeTask(item);
};

export const remove = async (userId, id) => {
  const item = await taskRepository.deleteById(id, userId);
  if (!item) {
    throw ApiError.notFound("Task not found or you don't have permission");
  }
};

export const getSummary = async (userId, query = {}) => {
  const upcomingLimit = query.upcomingLimit ?? DEFAULT_UPCOMING_LIMIT;
  const overdueLimit = query.overdueLimit ?? DEFAULT_OVERDUE_LIMIT;

  const [upcoming, overdue, completedCount, pendingCount] = await Promise.all([
    taskRepository.findUpcoming(userId, upcomingLimit),
    taskRepository.findOverdue(userId, overdueLimit),
    taskRepository.countByUserId(userId, { status: TASK_STATUS.COMPLETED }),
    taskRepository.countByUserId(userId, { status: TASK_STATUS.PENDING }),
  ]);

  return serializeTaskSummary({
    upcoming,
    overdue,
    completedCount,
    pendingCount,
  });
};
