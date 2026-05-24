export const serializeSubject = (subject) => ({
  id: subject.id,
  name: subject.name,
  difficulty: subject.difficulty,
  color: subject.color,
  progress: subject.progress ?? 0,
  examDate: subject.examDate ?? null,
  createdAt: subject.createdAt,
  updatedAt: subject.updatedAt,
});

export const serializeSubjectList = (subjects) =>
  subjects.map(serializeSubject);
