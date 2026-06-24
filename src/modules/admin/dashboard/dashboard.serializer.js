const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export const serializeWeeklyActivity = (rows = []) => {
  const byDate = new Map(
    rows
      .map((row) => {
        const dateKey = toDateKey(row.day_date);
        if (!dateKey) return null;
        return [
          dateKey,
          {
            sessions: Number(row.sessions ?? 0),
            students: Number(row.students ?? 0),
          },
        ];
      })
      .filter(Boolean),
  );

  const today = new Date();
  const result = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const dateKey = date.toISOString().slice(0, 10);
    const counts = byDate.get(dateKey) ?? { sessions: 0, students: 0 };

    result.push({
      day: DAY_LABELS[date.getDay()],
      date: dateKey,
      sessions: counts.sessions,
      students: counts.students,
    });
  }

  return result;
};

export const serializeDashboardStats = ({
  totalStudents,
  activeStudents,
  lockedStudents,
  totalSubjects,
}) => ({
  totalStudents,
  activeStudents,
  lockedStudents,
  totalSubjects,
});

export const serializeRecentContentItem = (item) => {
  if (!item) return null;

  const plain = item.get ? item.get({ plain: true }) : item;
  const owner = plain.user ?? null;
  const uploadedBy =
    owner?.fullName?.trim() ||
    owner?.email?.split("@")[0] ||
    "Unknown";

  return {
    id: plain.id,
    title: plain.title,
    type: plain.type,
    uploadedBy,
    createdAt: plain.createdAt ?? plain.created_at ?? null,
  };
};

export const serializeRecentContentList = (items) =>
  (items ?? []).map((item) => serializeRecentContentItem(item)).filter(Boolean);
