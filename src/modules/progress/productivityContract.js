/**
 * Engagement modules (goals, achievements) must import productivity rules from here only.
 * Re-exports focus analytics authority — no duplicated SQL or thresholds.
 *
 * Session count semantics (from getSummary):
 * - completedCount / totalSessions — archive metric (A): all status = 'completed' sessions.
 * - qualifyingCompletedCount — productivity metric (B): completed sessions with work time
 *   >= MIN_SESSION_SECONDS (same rule as isQualifyingSession / totalFocusSeconds).
 * Goals (completed_sessions) and focus session badges use qualifyingCompletedCount only.
 */

export {
  FOCUS_ANALYTICS,
  effectiveWorkSeconds,
  isQualifyingSession,
  sessionStudyDate,
} from "../focus/focus.analytics.constants.js";

export {
  calculateStreakFromDailyMap,
  refreshFocusStreakCache,
} from "../focus/focus.analytics.service.js";
