export const serializeSubject = (subject) => ({
  id: subject.id,
  name: subject.name,
  credits: subject.credits ?? null,
  difficulty: subject.difficulty ?? null,
  examDate: subject.examDate ?? null,
  color: subject.color ?? null,
  progress: subject.progress != null ? Number(subject.progress) : 0,
  priority: subject.priority ?? null,
  requiredHoursPerWeek:
    subject.requiredHoursPerWeek != null
      ? Number(subject.requiredHoursPerWeek)
      : null,
});

export const serializeSubjectList = (subjects) =>
  subjects.map(serializeSubject);
