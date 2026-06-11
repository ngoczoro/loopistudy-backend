import ApiError from "../../utils/ApiError.js";
import { dayLabelToNumber } from "../users/user.constants.js";

export const toNumber = (value) => Number(value);

/** Standard interval overlap: (newStart < existEnd) && (newEnd > existStart) */
export const intervalsOverlap = (startA, endA, startB, endB) =>
  startA < endB && endA > startB;

export const sessionOverlapsExisting = (
  dayOfWeek,
  startHour,
  durationHours,
  existingSessions,
  excludeSessionId = null,
) => {
  const day = toNumber(dayOfWeek);
  const start = toNumber(startHour);
  const end = start + toNumber(durationHours);

  if (Number.isNaN(day) || Number.isNaN(start) || Number.isNaN(end)) {
    return false;
  }

  for (const existing of existingSessions) {
    if (excludeSessionId && existing.id === excludeSessionId) {
      continue;
    }
    if (toNumber(existing.dayOfWeek) !== day) {
      continue;
    }

    const existStart = toNumber(existing.startHour);
    const existEnd = existStart + toNumber(existing.durationHours);

    if (intervalsOverlap(start, end, existStart, existEnd)) {
      return true;
    }
  }

  return false;
};

export const sessionOverlapsBlockedSlot = (
  dayOfWeek,
  startHour,
  durationHours,
  blockedSlots,
) => {
  const sessionDay = toNumber(dayOfWeek);
  const start = toNumber(startHour);
  const end = start + toNumber(durationHours);

  for (const slot of blockedSlots) {
    const slotDay =
      typeof slot.day === "string"
        ? dayLabelToNumber(slot.day)
        : toNumber(slot.dayOfWeek ?? slot.day);

    if (slotDay === null || Number.isNaN(slotDay) || slotDay !== sessionDay) {
      continue;
    }

    const blockedStart = toNumber(slot.hour);
    const blockedEnd = blockedStart + 1;

    if (start < blockedEnd && end > blockedStart) {
      return true;
    }
  }

  return false;
};

export const assertSessionNotBlocked = (
  dayOfWeek,
  startHour,
  durationHours,
  blockedSlots,
) => {
  if (
    sessionOverlapsBlockedSlot(
      dayOfWeek,
      startHour,
      durationHours,
      blockedSlots,
    )
  ) {
    throw ApiError.badRequest(
      "This time overlaps a blocked slot in your availability settings",
    );
  }
};

export const assertSessionNoOverlap = (
  dayOfWeek,
  startHour,
  durationHours,
  existingSessions,
  excludeSessionId = null,
) => {
  if (
    sessionOverlapsExisting(
      dayOfWeek,
      startHour,
      durationHours,
      existingSessions,
      excludeSessionId,
    )
  ) {
    throw ApiError.badRequest(
      "This time slot already has a study session. Please choose another time.",
    );
  }
};

export const toOverlapSessionShape = (session) => ({
  id: session.id ?? null,
  dayOfWeek: session.dayOfWeek,
  startHour: toNumber(session.startHour),
  durationHours: toNumber(session.durationHours),
});
