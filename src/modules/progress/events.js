/** Engagement event envelopes — consumed only by progressCoordinator. */

export const PROGRESS_EVENT_TYPES = {
  FOCUS_SESSION_COMPLETED: "FOCUS_SESSION_COMPLETED",
  TASK_COMPLETED: "TASK_COMPLETED",
};

export const createFocusSessionCompletedEvent = (userId, payload) => ({
  type: PROGRESS_EVENT_TYPES.FOCUS_SESSION_COMPLETED,
  userId,
  occurredAt: payload.completedAt ?? new Date(),
  payload: {
    sessionId: payload.sessionId,
    workElapsedSeconds: payload.workElapsedSeconds ?? 0,
  },
});

export const createTaskCompletedEvent = (userId, payload) => ({
  type: PROGRESS_EVENT_TYPES.TASK_COMPLETED,
  userId,
  occurredAt: payload.completedAt ?? new Date(),
  payload: {
    taskId: payload.taskId,
  },
});
