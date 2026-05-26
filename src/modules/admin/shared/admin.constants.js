import { USER_STATUS } from "../../../config/constants.js";

/** Status values exposed to admin user-management filters. */
export const ADMIN_USER_STATUS_FILTER = [
  USER_STATUS.ACTIVE,
  USER_STATUS.LOCKED,
];

export const ADMIN_LIST_DEFAULT_ROLE = "student";

export const LOCK_REASON_MAX_LENGTH = 500;

export const DEFAULT_LOCK_REASON = "Violation of community standards";
