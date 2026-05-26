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
