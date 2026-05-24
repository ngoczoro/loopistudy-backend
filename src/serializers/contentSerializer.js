export const serializeContentItem = (item) => ({
  id: item.id,
  subjectId: item.subjectId ?? null,
  type: item.type,
  title: item.title,
  content: item.content ?? null,
  fileUrl: item.fileUrl ?? null,
  fileMime: item.fileMime ?? null,
  fileSizeBytes: item.fileSizeBytes ?? null,
  isPinned: item.isPinned ?? false,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const serializeContentList = (items) => items.map(serializeContentItem);
