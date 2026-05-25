import { Op } from "sequelize";
import sequelize from "../../config/database.js";
import { PRIORITY } from "../../config/constants.js";
import { PRIORITY_ORDER, TASK_STATUS } from "./task.constants.js";

const Task = () => sequelize.models.Task;

const PRIORITY_RANK = {
  [PRIORITY.HIGH]: PRIORITY_ORDER.high,
  [PRIORITY.MEDIUM]: PRIORITY_ORDER.medium,
  [PRIORITY.LOW]: PRIORITY_ORDER.low,
};

const todayDateOnly = () => new Date().toISOString().slice(0, 10);

export const buildWhereClause = (userId, filters = {}) => {
  const where = { userId };

  if (filters.subjectId !== undefined) {
    where.subjectId = filters.subjectId;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.completed !== undefined) {
    where.completed = filters.completed;
  } else if (filters.status === TASK_STATUS.COMPLETED) {
    where.completed = true;
  } else if (filters.status === TASK_STATUS.PENDING) {
    where.completed = false;
  }

  if (filters.dueDate) {
    where.taskDate = filters.dueDate;
  } else if (filters.dueDateFrom || filters.dueDateTo) {
    where.taskDate = {};
    if (filters.dueDateFrom) {
      where.taskDate[Op.gte] = filters.dueDateFrom;
    }
    if (filters.dueDateTo) {
      where.taskDate[Op.lte] = filters.dueDateTo;
    }
  }

  return where;
};

export const buildOrderClause = (sort) => {
  if (!sort) {
    return [
      ["completed", "ASC"],
      ["taskDate", "ASC"],
      ["createdAt", "DESC"],
    ];
  }

  const [field, direction = "asc"] = sort.split(":");
  const dir = direction.toLowerCase() === "desc" ? "DESC" : "ASC";

  if (field === "dueDate") {
    return [
      ["completed", "ASC"],
      ["taskDate", dir],
      ["createdAt", "DESC"],
    ];
  }

  if (field === "priority") {
    return [
      [
        sequelize.literal(
          `CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
        ),
        dir,
      ],
      ["taskDate", "ASC"],
    ];
  }

  if (field === "createdAt") {
    return [["createdAt", dir]];
  }

  return [
    ["completed", "ASC"],
    ["taskDate", "ASC"],
    ["createdAt", "DESC"],
  ];
};

export const findAllByUserId = async (
  userId,
  filters = {},
  pagination = {},
  sort,
) => {
  const where = buildWhereClause(userId, filters);
  const order = buildOrderClause(sort);

  const query = {
    where,
    order,
  };

  if (pagination.limit !== undefined) {
    query.limit = pagination.limit;
    query.offset = pagination.offset ?? 0;
  }

  return Task().findAndCountAll(query);
};

export const findByIdAndUserId = async (id, userId) =>
  Task().findOne({
    where: { id, userId },
  });

export const create = async (data) => Task().create(data);

export const updateById = async (id, userId, data) => {
  const item = await findByIdAndUserId(id, userId);
  if (!item) return null;

  await item.update(data);
  return item;
};

export const deleteById = async (id, userId) => {
  const item = await findByIdAndUserId(id, userId);
  if (!item) return null;

  await item.destroy();
  return item;
};

export const countByUserId = async (userId, filters = {}) => {
  const where = buildWhereClause(userId, filters);
  return Task().count({ where });
};

export const findUpcoming = async (userId, limit = 10) =>
  Task().findAll({
    where: {
      userId,
      completed: false,
      taskDate: { [Op.gte]: todayDateOnly() },
    },
    order: [
      ["taskDate", "ASC"],
      ["createdAt", "DESC"],
    ],
    limit,
  });

export const findOverdue = async (userId, limit = 10) =>
  Task().findAll({
    where: {
      userId,
      completed: false,
      taskDate: { [Op.lt]: todayDateOnly() },
    },
    order: [
      ["taskDate", "ASC"],
      ["createdAt", "DESC"],
    ],
    limit,
  });

export { PRIORITY_RANK };
