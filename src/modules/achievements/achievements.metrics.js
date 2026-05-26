import { getSummary } from "../focus/focus.analytics.service.js";
import * as taskRepository from "../tasks/task.repository.js";
import { TASK_STATUS } from "../tasks/task.constants.js";

/**
 * Read-only metrics for badge checks — uses canonical focus analytics summary
 * (qualifying completed sessions for focus badges) and tasks repository counts.
 * No custom focus SQL.
 */
export const loadEngagementMetrics = async (userId, { streakSnapshot = null } = {}) => {
  const summary = await getSummary(userId);
  const taskCompletedCount = await taskRepository.countByUserId(userId, {
    status: TASK_STATUS.COMPLETED,
  });

  return {
    focusCompletedCount: summary.qualifyingCompletedCount,
    taskCompletedCount,
    currentStreak: streakSnapshot?.currentStreak ?? 0,
    longestStreak: streakSnapshot?.longestStreak ?? 0,
  };
};
