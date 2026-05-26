import { normalizeRole, normalizeStatus } from "../../auth/auth.serializer.js";

const toIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const serializeAdminUser = (user) => {
  if (!user) return null;

  const plain = user.get ? user.get({ plain: true }) : user;

  return {
    id: plain.id,
    name: plain.fullName ?? plain.name ?? null,
    email: plain.email,
    role: normalizeRole(plain.role),
    status: normalizeStatus(plain.status),
    avatarUrl: plain.avatarUrl ?? null,
    lockedAt: toIso(plain.lockedAt),
    lockedReason: plain.lockedReason ?? null,
    createdAt: toIso(plain.createdAt),
    updatedAt: toIso(plain.updatedAt),
  };
};

export const serializeAdminUserList = (users) =>
  users.map((user) => serializeAdminUser(user)).filter(Boolean);

export const serializeAdminUserDetail = (user) => {
  const base = serializeAdminUser(user);
  if (!base) return null;

  return {
    id: base.id,
    name: base.name,
    email: base.email,
    status: base.status,
    role: base.role,
    avatarUrl: base.avatarUrl,
    lockedAt: base.lockedAt,
    lockedReason: base.lockedReason,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
};
