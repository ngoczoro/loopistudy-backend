import { DEFAULT_GOAL_TIMEZONE } from "./goals.constants.js";

/**
 * Period window policy (Phase 2):
 * - Boundaries are UTC calendar dates (YYYY-MM-DD), matching focus analytics
 *   `COALESCE(completed_at, started_at)::date` aggregation.
 * - `timezone` on study_goals is persisted for future locale-aware windows;
 *   v2 computation still uses UTC until user preference wiring exists.
 */

const toDateKeyUtc = (date) => date.toISOString().slice(0, 10);

/** Monday-start week (aligned with planner week helpers). */
export const resolvePeriodWindow = (period, referenceDate = new Date()) => {
  const ref = new Date(referenceDate);
  const todayKey = toDateKeyUtc(ref);

  if (period === "daily") {
    return {
      period,
      startDate: todayKey,
      endDate: todayKey,
      timezone: DEFAULT_GOAL_TIMEZONE,
    };
  }

  if (period === "weekly") {
    const day = ref.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(ref);
    monday.setUTCDate(ref.getUTCDate() + diff);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    return {
      period,
      startDate: toDateKeyUtc(monday),
      endDate: toDateKeyUtc(sunday),
      timezone: DEFAULT_GOAL_TIMEZONE,
    };
  }

  if (period === "monthly") {
    const monthStart = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1),
    );
    const monthEnd = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0),
    );

    return {
      period,
      startDate: toDateKeyUtc(monthStart),
      endDate: toDateKeyUtc(monthEnd),
      timezone: DEFAULT_GOAL_TIMEZONE,
    };
  }

  return {
    period,
    startDate: todayKey,
    endDate: todayKey,
    timezone: DEFAULT_GOAL_TIMEZONE,
  };
};

export const isPeriodExpired = (endDateKey, referenceDate = new Date()) =>
  endDateKey < toDateKeyUtc(referenceDate);
