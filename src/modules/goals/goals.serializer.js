import { resolveEffectiveMetricKey } from "./goals.helpers.js";

const toNumber = (value) => Number(value ?? 0);

export const serializeGoal = (goal, computed = {}) => {
  const metricKey = computed.metricKey ?? resolveEffectiveMetricKey(goal);
  const target = toNumber(computed.target ?? goal.targetValue);
  const progress = toNumber(computed.progress);
  const percentComplete = computed.percentComplete ?? 0;
  const status = computed.status ?? (goal.active ? "active" : "paused");

  return {
    id: goal.id,
    title: goal.title,
    metricKey,
    unit: goal.unit,
    period: goal.period,
    timezone: goal.timezone ?? "UTC",
    target,
    targetValue: toNumber(goal.targetValue),
    progress,
    percentComplete,
    status,
    active: Boolean(goal.active),
    currentValue:
      metricKey === "manual" ? toNumber(goal.currentValue) : progress,
    periodWindow: computed.periodWindow ?? null,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
};

export const serializeGoalList = (goals) => goals;
