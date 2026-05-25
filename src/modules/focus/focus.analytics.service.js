import sequelize from "../../config/database.js";
import {
  FOCUS_ANALYTICS,
  effectiveWorkSeconds,
} from "./focus.analytics.constants.js";
import * as analyticsRepository from "./focus.analytics.repository.js";

const toDateKey = (date) => date.toISOString().slice(0, 10);

const addDays = (dateKey, delta) => {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return toDateKey(d);
};

const buildDailyMap = (rows) => {
  const map = {};

  for (const row of rows) {
    map[row.date] = Number(row.focus_seconds ?? 0);
  }

  return map;
};

const dayQualifies = (dailyMap, dateKey) =>
  (dailyMap[dateKey] ?? 0) >= FOCUS_ANALYTICS.MIN_STREAK_DAY_SECONDS;

export const calculateStreakFromDailyMap = (dailyMap, todayKey = toDateKey(new Date())) => {
  let currentStreak = 0;
  let longestStreak = 0;
  let running = 0;
  let lastStudyDate = null;

  const sortedDates = Object.keys(dailyMap).sort();

  for (const date of sortedDates) {
    if (dayQualifies(dailyMap, date)) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
      lastStudyDate = date;
    } else {
      running = 0;
    }
  }

  if (dayQualifies(dailyMap, todayKey)) {
    currentStreak = 1;
    let cursor = addDays(todayKey, -1);

    while (dayQualifies(dailyMap, cursor)) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  } else {
    let cursor = addDays(todayKey, -1);

    while (dayQualifies(dailyMap, cursor)) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastStudyDate,
    todayQualifies: dayQualifies(dailyMap, todayKey),
    todayFocusSeconds: dailyMap[todayKey] ?? 0,
    minDaySeconds: FOCUS_ANALYTICS.MIN_STREAK_DAY_SECONDS,
  };
};

const defaultDateRange = (days = FOCUS_ANALYTICS.DEFAULT_TREND_DAYS) => {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));

  return {
    fromDate: toDateKey(from),
    toDate: toDateKey(to),
  };
};

const upsertUserStreak = async (userId, streakData) => {
  const { UserStreak: StreakModel } = sequelize.models;

  const [record] = await StreakModel.findOrCreate({
    where: { userId },
    defaults: {
      userId,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      lastStudyDate: streakData.lastStudyDate,
    },
  });

  const longestStreak = Math.max(record.longestStreak ?? 0, streakData.longestStreak);

  await record.update({
    currentStreak: streakData.currentStreak,
    longestStreak,
    lastStudyDate: streakData.lastStudyDate,
  });

  return {
    currentStreak: streakData.currentStreak,
    longestStreak,
    lastStudyDate: streakData.lastStudyDate,
  };
};

export const getSummary = async (userId, query = {}) => {
  const { fromDate = null, toDate = null } = query;
  const row = await analyticsRepository.aggregateSummary(userId, { fromDate, toDate });

  const todayKey = toDateKey(new Date());
  const todayRows = await analyticsRepository.aggregateDailyTrends(userId, {
    fromDate: todayKey,
    toDate: todayKey,
  });
  const todayFocusSeconds = Number(todayRows[0]?.focus_seconds ?? 0);

  const weekRange = defaultDateRange(7);
  const weekRows = await analyticsRepository.aggregateDailyTrends(userId, weekRange);
  const weekFocusSeconds = weekRows.reduce(
    (sum, r) => sum + Number(r.focus_seconds ?? 0),
    0,
  );

  const monthRange = defaultDateRange(30);
  const monthRows = await analyticsRepository.aggregateDailyTrends(userId, monthRange);
  const monthFocusSeconds = monthRows.reduce(
    (sum, r) => sum + Number(r.focus_seconds ?? 0),
    0,
  );

  return {
    totalFocusSeconds: Number(row.total_focus_seconds ?? 0),
    totalFocusMinutes: Math.round(Number(row.total_focus_seconds ?? 0) / 60),
    completedCount: Number(row.completed_count ?? 0),
    abandonedCount: Number(row.abandoned_count ?? 0),
    totalSessions: Number(row.total_sessions ?? 0),
    avgSessionMinutes: Math.round(Number(row.avg_session_seconds ?? 0) / 60),
    todayFocusSeconds,
    weekFocusSeconds,
    monthFocusSeconds,
    rules: {
      minSessionSeconds: FOCUS_ANALYTICS.MIN_SESSION_SECONDS,
      minStreakDaySeconds: FOCUS_ANALYTICS.MIN_STREAK_DAY_SECONDS,
      productivityStatuses: FOCUS_ANALYTICS.ANALYTICS_STATUSES,
      abandonedCountsPartialCredit: false,
      abandonedCountDisplayOnly: true,
    },
  };
};

export const getTrends = async (userId, query = {}) => {
  const range = defaultDateRange(query.days ?? FOCUS_ANALYTICS.DEFAULT_TREND_DAYS);
  const fromDate = query.fromDate ?? range.fromDate;
  const toDate = query.toDate ?? range.toDate;

  const rows = await analyticsRepository.aggregateDailyTrends(userId, {
    fromDate,
    toDate,
  });

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const points = [];
  let cursor = fromDate;

  while (cursor <= toDate) {
    const row = byDate.get(cursor);
    points.push({
      date: cursor,
      focusSeconds: Number(row?.focus_seconds ?? 0),
      focusMinutes: Math.round(Number(row?.focus_seconds ?? 0) / 60),
      completedCount: Number(row?.completed_count ?? 0),
      abandonedCount: Number(row?.abandoned_count ?? 0),
    });
    cursor = addDays(cursor, 1);
  }

  return {
    fromDate,
    toDate,
    granularity: "day",
    points,
  };
};

export const getSubjectStats = async (userId, query = {}) => {
  const rows = await analyticsRepository.aggregateSubjectStats(userId, {
    fromDate: query.fromDate ?? null,
    toDate: query.toDate ?? null,
  });

  return rows.map((row) => ({
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    subjectColor: row.subjectColor,
    sessionCount: Number(row.session_count ?? 0),
    completedCount: Number(row.completed_count ?? 0),
    abandonedCount: Number(row.abandoned_count ?? 0),
    focusSeconds: Number(row.focus_seconds ?? 0),
    focusMinutes: Math.round(Number(row.focus_seconds ?? 0) / 60),
    avgSessionMinutes: Math.round(Number(row.avg_session_seconds ?? 0) / 60),
  }));
};

export const getStreak = async (userId) => {
  const todayKey = toDateKey(new Date());
  const fromDate = addDays(todayKey, -364);

  const rows = await analyticsRepository.aggregateDailyStreakData(userId, {
    fromDate,
    toDate: todayKey,
  });

  const dailyMap = buildDailyMap(rows);
  const streakData = calculateStreakFromDailyMap(dailyMap, todayKey);
  const persisted = await upsertUserStreak(userId, streakData);

  return {
    ...persisted,
    todayQualifies: streakData.todayQualifies,
    todayFocusSeconds: streakData.todayFocusSeconds,
    todayFocusMinutes: Math.round(streakData.todayFocusSeconds / 60),
    minDayMinutes: Math.round(FOCUS_ANALYTICS.MIN_STREAK_DAY_SECONDS / 60),
    recoveryNote:
      "Missing a day resets your current streak. Study at least the daily minimum to keep it going.",
  };
};

export const getPlannerInsights = async (userId, query = {}) => {
  const weekStartDate =
    query.weekStartDate ??
    (() => {
      const d = new Date();
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setUTCDate(d.getUTCDate() + diff);
      return toDateKey(d);
    })();

  const rows = await analyticsRepository.aggregatePlannerInsights(userId, {
    weekStartDate,
  });

  const blocks = rows.map((row) => {
    const actualFocusSeconds = Number(row.actual_focus_seconds ?? 0);
    const plannedSeconds = Number(row.planned_seconds ?? 0);
    const completionRate =
      plannedSeconds > 0
        ? Math.min(100, Math.round((actualFocusSeconds / plannedSeconds) * 100))
        : Number(row.focus_session_count ?? 0) > 0
          ? 100
          : 0;

    return {
      plannerSessionId: row.plannerSessionId,
      plannerTitle: row.plannerTitle,
      dayOfWeek: Number(row.dayOfWeek),
      startHour: Number(row.startHour),
      durationHours: Number(row.durationHours),
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      focusSessionCount: Number(row.focus_session_count ?? 0),
      completedFocusCount: Number(row.completed_focus_count ?? 0),
      plannedMinutes: Math.round(plannedSeconds / 60),
      actualFocusMinutes: Math.round(actualFocusSeconds / 60),
      completionRate,
      hasLinkedFocus: Number(row.focus_session_count ?? 0) > 0,
    };
  });

  const linkedBlocks = blocks.filter((b) => b.hasLinkedFocus);
  const totalPlannedMinutes = blocks.reduce((s, b) => s + b.plannedMinutes, 0);
  const totalActualMinutes = blocks.reduce((s, b) => s + b.actualFocusMinutes, 0);

  return {
    weekStartDate,
    blocks,
    consistency: {
      plannedBlocks: blocks.length,
      linkedBlocks: linkedBlocks.length,
      linkRate:
        blocks.length > 0
          ? Math.round((linkedBlocks.length / blocks.length) * 100)
          : 0,
      totalPlannedMinutes,
      totalActualMinutes,
      overallCompletionRate:
        totalPlannedMinutes > 0
          ? Math.min(100, Math.round((totalActualMinutes / totalPlannedMinutes) * 100))
          : 0,
    },
  };
};

export const getFilteredHistory = async (userId, query = {}) => {
  const limit = Math.min(
    Number(query.limit) || FOCUS_ANALYTICS.DEFAULT_HISTORY_LIMIT,
    FOCUS_ANALYTICS.MAX_HISTORY_LIMIT,
  );
  const offset = Math.max(0, Number(query.offset) || 0);

  const { count, rows } = await analyticsRepository.findHistoryFiltered(userId, {
    status: query.status ?? null,
    subjectId: query.subjectId ?? null,
    fromDate: query.fromDate ?? null,
    toDate: query.toDate ?? null,
    limit,
    offset,
  });

  return {
    sessions: rows,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: offset + rows.length < count,
    },
  };
};

export { effectiveWorkSeconds };
