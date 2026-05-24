export const serializePlannerSession = (session) => ({
  id: session.id,
  subjectId: session.subjectId ?? null,
  title: session.title,
  day: session.dayOfWeek,
  start: session.startHour != null ? Number(session.startHour) : 0,
  duration: session.durationHours != null ? Number(session.durationHours) : 0,
  color: session.color ?? null,
  weekStartDate: session.weekStartDate ?? null,
  source: session.source ?? "manual",
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

export const serializePlannerSessionList = (sessions) =>
  sessions.map(serializePlannerSession);
