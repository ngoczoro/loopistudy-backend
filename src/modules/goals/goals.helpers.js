import {
  COMPUTED_GOAL_METRICS,
  GOAL_STATUSES,
  LEGACY_UNIT_TO_METRIC,
} from "./goals.constants.js";
import { isPeriodExpired, resolvePeriodWindow } from "./goals.periodUtils.js";
import {
  resolveComputedProgress,
  resolveTargetAmount,
} from "./goals.metricsProviders.js";

export const resolveEffectiveMetricKey = (goal) => {
  const key = goal.metricKey ?? "manual";
  if (key !== "manual") {
    return key;
  }
  return LEGACY_UNIT_TO_METRIC[goal.unit] ?? "manual";
};

const computePercent = (progress, target) => {
  if (target <= 0) {
    return progress > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((progress / target) * 100));
};

export const buildGoalProgressSnapshot = async (userId, goal) => {
  const metricKey = resolveEffectiveMetricKey(goal);
  const periodWindow = resolvePeriodWindow(goal.period);
  const targetAmount = resolveTargetAmount(
    metricKey,
    goal.targetValue,
    goal.unit,
  );

  let progress;
  if (metricKey === "manual") {
    progress = Number(goal.currentValue ?? 0);
  } else {
    progress = await resolveComputedProgress(userId, metricKey, {
      fromDate: periodWindow.startDate,
      toDate: periodWindow.endDate,
    });
  }

  const percentComplete = computePercent(progress, targetAmount);

  let status = goal.active ? GOAL_STATUSES.ACTIVE : GOAL_STATUSES.PAUSED;
  if (!goal.active) {
    status = GOAL_STATUSES.PAUSED;
  } else if (isPeriodExpired(periodWindow.endDate)) {
    status = GOAL_STATUSES.PAUSED;
  } else if (progress >= targetAmount && targetAmount > 0) {
    status = GOAL_STATUSES.COMPLETED;
  }

  return {
    metricKey,
    target: targetAmount,
    progress,
    percentComplete,
    status,
    periodWindow: {
      ...periodWindow,
      timezone: goal.timezone ?? periodWindow.timezone,
    },
    isComputed: COMPUTED_GOAL_METRICS.includes(metricKey),
  };
};
