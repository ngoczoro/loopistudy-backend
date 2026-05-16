import { initializeModels } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

const models = initializeModels();
const { Notification } = models;

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({ where: { userId: req.user.userId } });
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({ where: { id, userId: req.user.userId } });
    if (!notification) throw new ApiError(404, "Notification not found");

    await notification.update({ isRead: true, readAt: new Date() });
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};
