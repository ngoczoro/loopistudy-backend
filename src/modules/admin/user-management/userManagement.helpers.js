import {
  DEFAULT_LOCK_REASON,
  LOCK_REASON_MAX_LENGTH,
} from "../shared/admin.constants.js";

export const normalizeLockReason = (reason) => {
  const trimmed = String(reason ?? "").trim().slice(0, LOCK_REASON_MAX_LENGTH);
  return trimmed || DEFAULT_LOCK_REASON;
};

export const getDisplayUserName = (user) =>
  user?.fullName?.trim() || user?.email?.split("@")[0] || "User";
