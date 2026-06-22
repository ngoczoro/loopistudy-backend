import ApiError from "../../utils/ApiError.js";
import { DEFAULT_GOAL_TIMEZONE, LEGACY_UNIT_TO_METRIC } from "./goals.constants.js";
import {
  buildGoalProgressSnapshot,
  resolveEffectiveMetricKey,
} from "./goals.helpers.js";
import * as goalsRepository from "./goals.repository.js";
import { serializeGoal, serializeGoalList } from "./goals.serializer.js";

const normalizeMetricKey = (input) => {
  if (input.metricKey) {
    return input.metricKey;
  }
  if (input.unit && LEGACY_UNIT_TO_METRIC[input.unit]) {
    return LEGACY_UNIT_TO_METRIC[input.unit];
  }
  return "manual";
};

const assertOwned = async (userId, id) => {
  const goal = await goalsRepository.findByIdAndUser(id, userId);
  if (!goal) {
    throw ApiError.notFound("Study goal not found or you don't have permission");
  }
  return goal;
};

const enrichGoal = async (userId, goal) => {
  const computed = await buildGoalProgressSnapshot(userId, goal);
  return serializeGoal(goal, computed);
};

export const list = async (userId, query = {}) => {
  const includeInactive =
    query.includeInactive === true || query.includeInactive === "true";

  const rows = await goalsRepository.findAllActiveByUser(userId, {
    includeInactive,
  });

  const items = await Promise.all(rows.map((row) => enrichGoal(userId, row)));
  return serializeGoalList(items);
};

export const getById = async (userId, id) => {
  const goal = await assertOwned(userId, id);
  return enrichGoal(userId, goal);
};

export const create = async (userId, input) => {
  const metricKey = normalizeMetricKey(input);

  const goal = await goalsRepository.create({
    userId,
    title: input.title.trim(),
    targetValue: input.targetValue,
    currentValue: metricKey === "manual" ? input.currentValue ?? 0 : 0,
    unit: input.unit,
    period: input.period,
    active: input.active ?? true,
    metricKey,
    timezone: input.timezone ?? DEFAULT_GOAL_TIMEZONE,
  });

  return enrichGoal(userId, goal);
};

export const update = async (userId, id, input) => {
  const goal = await assertOwned(userId, id);
  const effectiveKey = resolveEffectiveMetricKey(goal);
  const nextMetricKey =
    input.metricKey !== undefined ? input.metricKey : goal.metricKey;

  const payload = {};

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.targetValue !== undefined) payload.targetValue = input.targetValue;
  if (input.unit !== undefined) payload.unit = input.unit;
  if (input.period !== undefined) payload.period = input.period;
  if (input.active !== undefined) payload.active = input.active;
  if (input.metricKey !== undefined) payload.metricKey = input.metricKey;
  if (input.timezone !== undefined) payload.timezone = input.timezone;

  if (input.currentValue !== undefined) {
    const keyForManual =
      nextMetricKey === "manual" || effectiveKey === "manual";
    if (keyForManual) {
      payload.currentValue = input.currentValue;
    }
  }

  if (Object.keys(payload).length === 0) {
    throw ApiError.badRequest("At least one field is required to update");
  }

  const updated = await goalsRepository.update(goal, payload);
  return enrichGoal(userId, updated);
};

export const remove = async (userId, id) => {
  const goal = await assertOwned(userId, id);
  await goalsRepository.remove(goal);
};
