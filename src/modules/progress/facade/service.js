import { getSummary, getStreak } from "../../focus/focus.analytics.service.js";
import * as goalsService from "../../goals/goals.service.js";
import * as achievementsService from "../../achievements/achievements.service.js";
import { loadEngagementMetrics } from "../../achievements/achievements.metrics.js";
import {
  serializeProgressSummary,
  serializeProgressMilestones,
} from "./serializer.js";

/**
 * Read-only aggregation — composes canonical module outputs only.
 * No metric definitions, transforms, or scoring rules live here.
 */
export const getProgressSummary = async (userId) => {
  const [focusSummary, goals, badges, streak] = await Promise.all([
    getSummary(userId),
    goalsService.list(userId),
    achievementsService.listBadgesForUser(userId),
    getStreak(userId),
  ]);

  return serializeProgressSummary({
    focusSummary,
    goals,
    badges,
    streak,
  });
};

export const getProgressStreaks = async (userId) => {
  return getStreak(userId);
};

export const getProgressMilestones = async (userId) => {
  const [streak, goals, badges] = await Promise.all([
    getStreak(userId),
    goalsService.list(userId),
    achievementsService.listBadgesForUser(userId),
  ]);

  const metrics = await loadEngagementMetrics(userId, {
    streakSnapshot: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    },
  });

  return serializeProgressMilestones({ metrics, goals, badges });
};
