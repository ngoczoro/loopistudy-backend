import { FOCUS_SESSION_STATUS } from "../../config/constants.js";

const computeRemainingSeconds = (session) => {
  if (session.status === FOCUS_SESSION_STATUS.PAUSED) {
    return Math.max(0, session.remainingSeconds ?? 0);
  }

  if (session.status === FOCUS_SESSION_STATUS.RUNNING && session.phaseEndsAt) {
    const ms = new Date(session.phaseEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }

  return Math.max(0, session.remainingSeconds ?? 0);
};

export const serializeFocusSession = (session) => {
  const remainingSeconds = computeRemainingSeconds(session);

  return {
    id: session.id,
    plannerSessionId: session.plannerSessionId ?? null,
    subjectId: session.subjectId,
    subjectName: session.subject?.name ?? null,
    status: session.status,
    currentPhase: session.currentPhase ?? "work",
    sessionNumber: session.sessionNumber ?? 1,
    plannedWorkMinutes: session.plannedWorkMinutes ?? null,
    plannedBreakMinutes: session.plannedBreakMinutes ?? null,
    actualWorkMinutes: session.actualWorkMinutes ?? null,
    notes: session.notes ?? null,
    startedAt: session.startedAt ?? null,
    pausedAt: session.pausedAt ?? null,
    totalPausedSeconds: session.totalPausedSeconds ?? 0,
    completedAt: session.completedAt ?? null,
    phaseEndsAt: session.phaseEndsAt ?? null,
    remainingSeconds,
    workElapsedSeconds: session.workElapsedSeconds ?? 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
};

export const serializeFocusSessionList = (sessions) =>
  sessions.map(serializeFocusSession);
