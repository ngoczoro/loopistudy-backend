import { refreshFocusStreakCache } from "../focus/focus.analytics.service.js";
import { PROGRESS_EVENT_TYPES } from "./events.js";
import * as achievementsEngine from "../achievements/achievements.engine.js";

/**
 * Synchronous engagement orchestration (v1). No domain rules here — delegate only.
 * Failures are logged and never propagated to focus/task write paths.
 */
export const handleProgressEvent = async (event) => {
  const { type, userId } = event;

  if (!userId || !type) {
    console.error("[progressCoordinator] Invalid event envelope", event);
    return;
  }

  try {
    let streakSnapshot = null;

    if (type === PROGRESS_EVENT_TYPES.FOCUS_SESSION_COMPLETED) {
      streakSnapshot = await refreshFocusStreakCache(userId);
    }

    await achievementsEngine.evaluate(userId, event, { streakSnapshot });
  } catch (error) {
    console.error("[progressCoordinator] Non-blocking failure", {
      type,
      userId,
      message: error.message,
    });
  }
};

/**
 * Fire-and-forget wrapper for post-commit hooks (same-process, no queue).
 */
export const dispatchProgressEvent = (event) => {
  void handleProgressEvent(event);
};
