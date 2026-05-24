export const serializeNotification = (notification) => ({
  id: notification.id,
  type: notification.type,
  audience: notification.audience,
  title: notification.title,
  body: notification.body ?? null,
  isRead: notification.isRead ?? false,
  metadata: notification.metadata ?? null,
  createdAt: notification.createdAt,
});

export const serializeNotificationList = (notifications) =>
  notifications.map(serializeNotification);
