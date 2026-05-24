export const serializeFocusSession = (session) => ({
  id: session.id,
  plannerSessionId: session.plannerSessionId ?? null,
  subjectId: session.subjectId,
  status: session.status,
  sessionNumber: session.sessionNumber ?? 1,
  plannedWorkMinutes: session.plannedWorkMinutes ?? null,
  plannedBreakMinutes: session.plannedBreakMinutes ?? null,
  actualWorkMinutes: session.actualWorkMinutes ?? null,
  startedAt: session.startedAt ?? null,
  pausedAt: session.pausedAt ?? null,
  totalPausedSeconds: session.totalPausedSeconds ?? 0,
  completedAt: session.completedAt ?? null,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

export const serializeFocusSessionList = (sessions) =>
  sessions.map(serializeFocusSession);
