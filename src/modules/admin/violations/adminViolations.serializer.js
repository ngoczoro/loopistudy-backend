import { USER_STATUS } from "../../../config/constants.js";
import { getDisplayUserName } from "../user-management/userManagement.helpers.js";
import {
  computeUserRiskLevel,
  getViolationTypeLabel,
} from "./adminViolations.helpers.js";

const toIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const serializeViolationRow = (violation) => {
  if (!violation) return null;

  const plain = violation.get ? violation.get({ plain: true }) : violation;

  return {
    id: plain.id,
    userId: plain.userId,
    type: plain.type,
    typeLabel: getViolationTypeLabel(plain.type),
    contentId: plain.contentItemId ?? null,
    contentTitle: plain.contentTitle ?? null,
    contentType: plain.contentType ?? null,
    detectedAt: toIso(plain.detectedAt),
    status: plain.resolved ? "resolved" : "pending",
    resolved: Boolean(plain.resolved),
    severity: plain.severity ?? null,
  };
};

export const serializeFlaggedUsersList = (violations) => {
  const grouped = (violations ?? []).reduce((acc, violation) => {
    const plain = violation.get ? violation.get({ plain: true }) : violation;
    const userId = plain.userId;
    const user = plain.user ?? null;

    if (!acc[userId]) {
      acc[userId] = {
        userId,
        userName: getDisplayUserName(user),
        userEmail: user?.email ?? null,
        locked: user?.status === USER_STATUS.LOCKED,
        status: user?.status ?? null,
        lockedAt: toIso(user?.lockedAt),
        lockedReason: user?.lockedReason ?? null,
        violations: [],
      };
    }

    const row = serializeViolationRow(violation);
    if (row) {
      acc[userId].violations.push(row);
    }

    return acc;
  }, {});

  return Object.values(grouped)
    .map((entry) => {
      const unresolvedCount = entry.violations.filter((v) => !v.resolved).length;

      return {
        ...entry,
        totalCount: entry.violations.length,
        unresolvedCount,
        riskLevel: computeUserRiskLevel(unresolvedCount),
      };
    })
    .sort((a, b) => b.unresolvedCount - a.unresolvedCount);
};

export const serializeViolationStats = (violations) => {
  const flaggedUsers = serializeFlaggedUsersList(violations);
  const withUnresolved = flaggedUsers.filter((user) => user.unresolvedCount > 0);

  return {
    lowRiskUsers: withUnresolved.filter((user) => user.riskLevel === "low").length,
    mediumRiskUsers: withUnresolved.filter((user) => user.riskLevel === "medium")
      .length,
    highRiskUsers: withUnresolved.filter((user) => user.riskLevel === "high").length,
    usersWithUnresolvedViolations: withUnresolved.length,
  };
};
