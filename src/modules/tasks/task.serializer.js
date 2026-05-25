import { TASK_STATUS } from "./task.constants.js";

const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const toIsoDateTime = (value) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export const serializeTask = (item) => {
  if (!item) return null;

  const plain = item.get ? item.get({ plain: true }) : item;
  const taskDate = toIsoDate(plain.taskDate);
  const completed = Boolean(plain.completed);

  return {
    id: plain.id,
    userId: plain.userId,
    subjectId: plain.subjectId ?? null,
    title: plain.title,
    description: plain.description ?? null,
    priority: plain.priority,
    status: completed ? TASK_STATUS.COMPLETED : TASK_STATUS.PENDING,
    dueDate: taskDate,
    taskDate,
    completed,
    completedAt: toIsoDateTime(plain.completedAt),
    createdAt: toIsoDateTime(plain.createdAt),
    updatedAt: toIsoDateTime(plain.updatedAt),
  };
};

export const serializeTaskList = (items) =>
  items.map((item) => serializeTask(item));

export const serializeTaskSummary = ({
  upcoming,
  overdue,
  completedCount,
  pendingCount,
}) => ({
  upcoming: serializeTaskList(upcoming),
  overdue: serializeTaskList(overdue),
  completedCount,
  pendingCount,
});
