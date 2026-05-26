import { serializeSubject } from "../../subjects/subject.serializer.js";
import { getDisplayUserName } from "../user-management/userManagement.helpers.js";

const toIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const serializeAdminSubject = (subject) => {
  if (!subject) return null;

  const base = serializeSubject(subject);
  const plain = subject.get ? subject.get({ plain: true }) : subject;
  const owner = plain.user ?? null;

  return {
    ...base,
    owner: owner
      ? {
          id: owner.id,
          name: getDisplayUserName(owner),
          email: owner.email ?? null,
        }
      : null,
    createdAt: toIso(plain.createdAt),
    updatedAt: toIso(plain.updatedAt),
  };
};

export const serializeAdminSubjectList = (subjects) =>
  (subjects ?? []).map((subject) => serializeAdminSubject(subject)).filter(Boolean);
