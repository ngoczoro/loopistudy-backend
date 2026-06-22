import { DEFAULT_MAX_STUDY_HOURS_PER_DAY } from "../users/user.constants.js";

/**
 * Resolve max study hours per day for scheduler input.
 *
 * Precedence:
 * 1. Explicit request body value (when present and valid)
 * 2. Saved user preference
 * 3. Default (4 hours/day)
 */
export const resolveMaxStudyHoursPerDay = ({ requestValue, savedValue }) => {
  if (requestValue != null && Number.isFinite(Number(requestValue))) {
    return Number(requestValue);
  }

  if (savedValue != null && Number.isFinite(Number(savedValue))) {
    return Number(savedValue);
  }

  return DEFAULT_MAX_STUDY_HOURS_PER_DAY;
};
