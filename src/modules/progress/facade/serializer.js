import {
  BADGE_CODES,
  BADGE_THRESHOLDS,
} from "../../achievements/achievements.constants.js";

/** Phase 1 badges with engine rules — thresholds from achievements.constants only. */
const PHASE_ONE_BADGE_MILESTONES = [
  {
    code: BADGE_CODES.FIRST_FOCUS_SESSION,
    threshold: 1,
    metricKey: "focusCompletedCount",
  },
  {
    code: BADGE_CODES.FIRST_TASK_COMPLETED,
    threshold: 1,
    metricKey: "taskCompletedCount",
  },
  {
    code: BADGE_CODES.THREE_DAY_STREAK,
    threshold: BADGE_THRESHOLDS.STREAK_DAYS,
    metricKey: "currentStreak",
  },
  {
    code: BADGE_CODES.TEN_COMPLETED_SESSIONS,
    threshold: BADGE_THRESHOLDS.FOCUS_SESSIONS,
    metricKey: "focusCompletedCount",
  },
];

const RECENT_UNLOCKED_LIMIT = 5;

const pickActiveGoals = (goals) =>
  goals.filter((goal) => goal.active === true && goal.status === "active");

const slimGoal = (goal) => ({
  id: goal.id,
  title: goal.title,
  metricKey: goal.metricKey,
  progress: goal.progress,
  target: goal.target,
  percentComplete: goal.percentComplete,
  status: goal.status,
  period: goal.period,
  periodWindow: goal.periodWindow,
});

export const serializeProgressSummary = ({
  focusSummary,
  goals,
  badges,
  streak,
}) => {
  const unlockedBadges = badges.filter((badge) => badge.unlocked);
  const recentUnlocked = [...unlockedBadges]
    .sort((a, b) => {
      const aTime = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
      const bTime = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, RECENT_UNLOCKED_LIMIT)
    .map((badge) => ({
      code: badge.code,
      name: badge.name,
      earnedAt: badge.earnedAt,
    }));

  return {
    focus: {
      qualifyingCompletedCount: focusSummary.qualifyingCompletedCount,
      totalFocusSeconds: focusSummary.totalFocusSeconds,
      totalFocusMinutes: focusSummary.totalFocusMinutes,
      todayFocusSeconds: focusSummary.todayFocusSeconds,
      completedCount: focusSummary.completedCount,
    },
    goals: {
      active: pickActiveGoals(goals).map(slimGoal),
      totalActive: pickActiveGoals(goals).length,
    },
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: streak.lastStudyDate,
      todayQualifies: streak.todayQualifies,
      todayFocusSeconds: streak.todayFocusSeconds,
    },
    achievements: {
      unlockedCount: unlockedBadges.length,
      totalCount: badges.length,
      recentUnlocked,
    },
  };
};

export const serializeProgressMilestones = ({ metrics, goals, badges }) => {
  const badgeByCode = new Map(badges.map((badge) => [badge.code, badge]));

  const nextBadges = PHASE_ONE_BADGE_MILESTONES.filter((definition) => {
    const badge = badgeByCode.get(definition.code);
    return badge && !badge.unlocked;
  })
    .map((definition) => {
      const badge = badgeByCode.get(definition.code);
      const current = Number(metrics[definition.metricKey] ?? 0);
      const threshold = definition.threshold;
      const remaining = Math.max(0, threshold - current);

      return {
        code: definition.code,
        name: badge.name,
        description: badge.description,
        metricKey: definition.metricKey,
        threshold,
        current,
        remaining,
      };
    });

  const goalHints = pickActiveGoals(goals)
    .map((goal) => ({
      id: goal.id,
      title: goal.title,
      metricKey: goal.metricKey,
      progress: goal.progress,
      target: goal.target,
      percentComplete: goal.percentComplete,
      remaining: Math.max(0, goal.target - goal.progress),
      period: goal.period,
    }));

  return {
    badges: {
      next: nextBadges,
    },
    goals: {
      hints: goalHints,
    },
  };
};
