import sequelize from "../config/database.js";
import { NOTIFICATION_TYPES } from "../config/enums.js";

const ALLOWED_UPDATE_FIELDS = ["isRead"];

/**
 * Whitelist query filters for list endpoint.
 * @param {Record<string, unknown>} query
 */
export const parseListFilters = (query = {}) => {
  const filters = {};

  if (query.isRead !== undefined && query.isRead !== "") {
    const raw = String(query.isRead).toLowerCase();
    if (raw === "true") filters.isRead = true;
    else if (raw === "false") filters.isRead = false;
  }

  if (
    typeof query.type === "string" &&
    NOTIFICATION_TYPES.includes(query.type)
  ) {
    filters.type = query.type;
  }

  return filters;
};

export const pickUpdatePayload = (body = {}) => {
  const payload = {};
  if (body.isRead !== undefined) {
    payload.isRead = Boolean(body.isRead);
  }
  return payload;
};

export const create = async (userId, data, options = {}) => {
  const { Notification } = sequelize.models;
  return await Notification.create({ ...data, userId }, options);
};

export const getAll = async (userId, limit, offset, filters = {}) => {
  const { Notification } = sequelize.models;
  return await Notification.findAndCountAll({
    where: { userId, ...filters },
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });
};

export const getById = async (userId, id) => {
  const { Notification } = sequelize.models;
  return await Notification.findOne({ where: { id, userId } });
};

export const update = async (userId, id, data) => {
  const { Notification } = sequelize.models;
  const item = await Notification.findOne({ where: { id, userId } });
  if (!item) return null;

  const payload = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (data[key] !== undefined) payload[key] = data[key];
  }
  if (Object.keys(payload).length === 0) return item;

  return await item.update(payload);
};

export const markAsRead = async (userId, id) => {
  return update(userId, id, { isRead: true });
};

export const remove = async (userId, id) => {
  const { Notification } = sequelize.models;
  const item = await Notification.findOne({ where: { id, userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};

export const removeAll = async (userId) => {
  const { Notification } = sequelize.models;
  return Notification.destroy({ where: { userId } });
};
