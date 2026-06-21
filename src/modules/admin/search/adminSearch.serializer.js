import { getDisplayUserName } from "../user-management/userManagement.helpers.js";
import { getViolationTypeLabel } from "../violations/adminViolations.helpers.js";

export const serializeAdminSearchUser = (user) => {
  if (!user) return null;

  const plain = user.get ? user.get({ plain: true }) : user;

  return {
    id: plain.id,
    fullName: getDisplayUserName(plain),
    email: plain.email ?? "",
    avatarUrl: plain.avatarUrl ?? null,
    role: plain.role ?? null,
    status: plain.status ?? null,
  };
};

export const serializeAdminSearchSubject = (subject, documentCount = 0) => {
  if (!subject) return null;

  const plain = subject.get ? subject.get({ plain: true }) : subject;

  return {
    id: plain.id,
    name: plain.name,
    documentCount,
    ownerName: plain.user ? getDisplayUserName(plain.user) : null,
  };
};

export const serializeAdminSearchDocument = (item) => {
  if (!item) return null;

  const plain = item.get ? item.get({ plain: true }) : item;
  const owner = plain.user ?? null;
  const subject = plain.subject ?? null;

  return {
    id: plain.id,
    title: plain.title,
    fileName: plain.fileName ?? null,
    type: plain.type ?? null,
    ownerName: owner ? getDisplayUserName(owner) : "Unknown",
    subjectId: subject?.id ?? plain.subjectId ?? null,
    subjectName: subject?.name ?? null,
  };
};

export const serializeAdminSearchQuiz = (quiz) => {
  if (!quiz) return null;

  const plain = quiz.get ? quiz.get({ plain: true }) : quiz;
  const questions = Array.isArray(plain.questions) ? plain.questions : [];

  return {
    id: plain.id,
    title: plain.title,
    questionCount: questions.length,
    subjectId: plain.subject?.id ?? plain.subjectId ?? null,
    subjectName: plain.subject?.name ?? null,
    ownerName: plain.user ? getDisplayUserName(plain.user) : null,
  };
};

export const serializeAdminSearchViolation = (violation) => {
  if (!violation) return null;

  const plain = violation.get ? violation.get({ plain: true }) : violation;

  return {
    id: plain.id,
    title: plain.contentTitle || getViolationTypeLabel(plain.type),
    type: plain.type,
    typeLabel: getViolationTypeLabel(plain.type),
    status: plain.resolved ? "resolved" : "pending",
    userId: plain.userId,
    userName: plain.user ? getDisplayUserName(plain.user) : null,
  };
};

export const serializeAdminSearchResult = ({
  users = [],
  subjects = [],
  documents = [],
  quizzes = [],
  violations = [],
}) => ({
  users,
  subjects,
  documents,
  quizzes,
  violations,
});
