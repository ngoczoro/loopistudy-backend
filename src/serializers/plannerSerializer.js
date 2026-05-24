export const serializePlannerSession = (session) => ({
  id: session.id,
  subjectId: session.subjectId ?? null,
  title: session.title,
  dayOfWeek: session.dayOfWeek,
  startHour: session.startHour,
  durationHours: session.durationHours,
  color: session.color ?? null,
  weekStartDate: session.weekStartDate ?? null,
  source: session.source ?? "manual",
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

export const serializePlannerSessionList = (sessions) =>
  sessions.map(serializePlannerSession);
