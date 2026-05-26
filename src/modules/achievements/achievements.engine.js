import {
  BADGE_CODES,
  BADGE_EVENT_MAP,
  BADGE_THRESHOLDS,
} from "./achievements.constants.js";
import * as achievementsRepository from "./achievements.repository.js";
import { loadEngagementMetrics } from "./achievements.metrics.js";
const evaluateRule = (code, metrics) => {
  switch (code) {
    case BADGE_CODES.FIRST_FOCUS_SESSION:
      return metrics.focusCompletedCount >= 1;
    case BADGE_CODES.FIRST_TASK_COMPLETED:
      return metrics.taskCompletedCount >= 1;
    case BADGE_CODES.THREE_DAY_STREAK:
      return metrics.currentStreak >= BADGE_THRESHOLDS.STREAK_DAYS;
    case BADGE_CODES.TEN_COMPLETED_SESSIONS:
      return metrics.focusCompletedCount >= BADGE_THRESHOLDS.FOCUS_SESSIONS;
    default:
      return false;
  }
};

const phaseOneBadgeCodes = Object.values(BADGE_CODES);

/**
 * Evaluate Phase 1 badge rules for a single engagement event.
 * Idempotent: unlock uses user_badges PK; missing catalog rows are skipped.
 */
export const evaluate = async (userId, event, options = {}) => {
  const { type } = event;
  const metrics = await loadEngagementMetrics(userId, {
    streakSnapshot: options.streakSnapshot,
  });

  const unlocked = [];

  for (const code of phaseOneBadgeCodes) {
    const allowedEvents = BADGE_EVENT_MAP[code] ?? [];
    if (!allowedEvents.includes(type)) {
      continue;
    }

    if (!evaluateRule(code, metrics)) {
      continue;
    }

    const badge = await achievementsRepository.findBadgeByCode(code);
    if (!badge) {
      console.warn("[achievementsEngine] Badge not in catalog, skipping", code);
      continue;
    }

    const alreadyHas = await achievementsRepository.hasUserBadge(userId, badge.id);
    if (alreadyHas) {
      continue;
    }

    const { created } = await achievementsRepository.unlockBadge(userId, badge.id);
    if (created) {
      unlocked.push(code);
      console.info("[achievementsEngine] Badge unlocked", { userId, code });
    }
  }

  return { unlocked, metrics };
};
