/** Business rules for focus session analytics and streaks. */
export const FOCUS_ANALYTICS = {
  /** Sessions shorter than this are visible in history but excluded from totals/streaks. */
  MIN_SESSION_SECONDS: 300,
  /** Minimum qualifying focus time per calendar day to count toward streaks. */
  MIN_STREAK_DAY_SECONDS: 900,
  /** Default lookback for trend charts. */
  DEFAULT_TREND_DAYS: 30,
  /** Default history page size. */
  DEFAULT_HISTORY_LIMIT: 20,
  MAX_HISTORY_LIMIT: 100,
  /** Statuses that contribute focus seconds, streaks, and planner actuals. */
  ANALYTICS_STATUSES: ["completed"],
  /** Display-only count in summary/trends; never summed into focus_seconds. */
  ABANDONED_DISPLAY_STATUS: "cancelled",
};

export const effectiveWorkSeconds = (row) => {
  if (row.work_elapsed_seconds != null) {
    return Math.max(0, Number(row.work_elapsed_seconds));
  }
  if (row.workElapsedSeconds != null) {
    return Math.max(0, Number(row.workElapsedSeconds));
  }
  if (row.actual_work_minutes != null) {
    return Math.max(0, Number(row.actual_work_minutes) * 60);
  }
  if (row.actualWorkMinutes != null) {
    return Math.max(0, Number(row.actualWorkMinutes) * 60);
  }
  return 0;
};

export const isQualifyingSession = (row) =>
  effectiveWorkSeconds(row) >= FOCUS_ANALYTICS.MIN_SESSION_SECONDS;

export const sessionStudyDate = (row) => {
  const anchor =
    row.completed_at ??
    row.completedAt ??
    row.started_at ??
    row.startedAt;

  if (!anchor) return null;

  return new Date(anchor).toISOString().slice(0, 10);
};
