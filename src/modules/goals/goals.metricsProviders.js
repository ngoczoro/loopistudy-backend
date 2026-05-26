import { getSummary, refreshFocusStreakCache } from "../focus/focus.analytics.service.js";
import * as taskRepository from "../tasks/task.repository.js";
import { COMPUTED_GOAL_METRICS } from "./goals.constants.js";

/**
 * Query-based progress from canonical providers only (no custom focus SQL).
 */
export const resolveComputedProgress = async (
  userId,
  metricKey,
  { fromDate, toDate },
) => {
  if (!COMPUTED_GOAL_METRICS.includes(metricKey)) {
    return null;
  }

  switch (metricKey) {
    case "focus_seconds": {
      const summary = await getSummary(userId, { fromDate, toDate });
      return Number(summary.totalFocusSeconds ?? 0);
    }
    case "completed_sessions": {
      const summary = await getSummary(userId, { fromDate, toDate });
      return Number(summary.qualifyingCompletedCount ?? 0);
    }
    case "tasks_completed": {
      return taskRepository.countCompletedInPeriod(userId, fromDate, toDate);
    }
    case "streak_days": {
      const streak = await refreshFocusStreakCache(userId);
      return Number(streak.currentStreak ?? 0);
    }
    default:
      return 0;
  }
};

/**
 * Normalize target to the same unit as progress for percent calculation.
 */
export const resolveTargetAmount = (metricKey, targetValue, unit) => {
  const target = Number(targetValue);

  if (metricKey === "focus_seconds") {
    if (unit === "hrs") return target * 3600;
    if (unit === "min") return target * 60;
    return target;
  }

  return target;
};
