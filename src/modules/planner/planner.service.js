import ApiError from "../../utils/ApiError.js";
import { assertOwned as assertSubjectOwned } from "../subjects/subject.service.js";
import { getBlockedSlots } from "../users/user.service.js";
import { dayLabelToNumber, DEFAULT_SOURCE } from "./planner.constants.js";
import * as plannerRepository from "./planner.repository.js";
import {
  serializePlannerSession,
  serializePlannerSessionList,
} from "./planner.serializer.js";

const toNumber = (value) => Number(value);

/** Standard interval overlap: (newStart < existEnd) && (newEnd > existStart) */
const intervalsOverlap = (startA, endA, startB, endB) =>
  startA < endB && endA > startB;

const sessionOverlapsExisting = (
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

const assertNoOverlappingSession = async (
  userId,
  weekStartDate,
  dayOfWeek,
  startHour,
  durationHours,
  excludeSessionId = null,
) => {
  const sessions = await plannerRepository.findAllByUserAndWeek(
    userId,
    weekStartDate,
  );

  if (
    sessionOverlapsExisting(
      dayOfWeek,
      startHour,
      durationHours,
      sessions,
      excludeSessionId,
    )
  ) {
    throw ApiError.badRequest(
      "This time slot already has a study session. Please choose another time.",
    );
  }
};

const sessionOverlapsBlockedSlot = (
  dayOfWeek,
  startHour,
  durationHours,
  blockedSlots,
  { logContext = null } = {},
) => {
  const sessionDay = toNumber(dayOfWeek);
  const start = toNumber(startHour);
  const end = start + toNumber(durationHours);

  if (logContext) {
    console.log("[assertNotBlocked] session", {
      ...logContext,
      dayOfWeek,
      sessionDay,
      startHour,
      durationHours,
      start,
      end,
      startIsNaN: Number.isNaN(start),
      endIsNaN: Number.isNaN(end),
    });
  }

  for (const slot of blockedSlots) {
    const slotDay =
      typeof slot.day === "string" ? dayLabelToNumber(slot.day) : toNumber(slot.day);

    if (slotDay === null || Number.isNaN(slotDay) || slotDay !== sessionDay) {
      continue;
    }

    const blockedStart = toNumber(slot.hour);
    const blockedEnd = blockedStart + 1;
    const overlaps = start < blockedEnd && end > blockedStart;

    if (logContext) {
      console.log("[assertNotBlocked] compare", {
        slotDay,
        slotDayLabel: slot.day,
        blockedHourRaw: slot.hour,
        blockedHourType: typeof slot.hour,
        blockedStart,
        blockedEnd,
        sessionStart: start,
        sessionEnd: end,
        overlaps,
      });
    }

    if (overlaps) {
      if (logContext) {
        console.log("[assertNotBlocked] REJECT", {
          reason: "interval_overlap",
          slotDay,
          blockedRange: [blockedStart, blockedEnd],
          sessionRange: [start, end],
        });
      }
      return true;
    }
  }

  return false;
};

const assertNotBlocked = async (userId, dayOfWeek, startHour, durationHours) => {
  const blockedSlots = await getBlockedSlots(userId);
  const logContext =
    process.env.NODE_ENV === "development"
      ? { userId, blockedSlotCount: blockedSlots.length }
      : null;

  if (
    sessionOverlapsBlockedSlot(
      dayOfWeek,
      startHour,
      durationHours,
      blockedSlots,
      { logContext },
    )
  ) {
    throw ApiError.badRequest(
      "This time overlaps a blocked slot in your availability settings",
    );
  }
};

const assertOwned = async (userId, sessionId) => {
  const session = await plannerRepository.findByIdAndUserId(sessionId, userId);

  if (!session) {
    throw ApiError.notFound("Planner session not found or you don't have permission");
  }

  return session;
};

const validateSubject = async (userId, subjectId) => {
  if (subjectId) {
    await assertSubjectOwned(userId, subjectId);
  }
};

const normalizeSubjectId = (subjectId) => subjectId || null;

const buildCreatePayload = (userId, input) => ({
  userId,
  title: input.title.trim(),
  subjectId: normalizeSubjectId(input.subjectId),
  dayOfWeek: input.dayOfWeek,
  startHour: input.startHour,
  durationHours: input.durationHours,
  color: input.color || null,
  weekStartDate: input.weekStartDate,
  source: input.source || DEFAULT_SOURCE,
});

const buildUpdatePayload = (input) => {
  const payload = {};

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.subjectId !== undefined) {
    payload.subjectId = normalizeSubjectId(input.subjectId);
  }
  if (input.dayOfWeek !== undefined) payload.dayOfWeek = input.dayOfWeek;
  if (input.startHour !== undefined) payload.startHour = input.startHour;
  if (input.durationHours !== undefined) {
    payload.durationHours = input.durationHours;
  }
  if (input.color !== undefined) payload.color = input.color || null;
  if (input.weekStartDate !== undefined) {
    payload.weekStartDate = input.weekStartDate;
  }
  if (input.source !== undefined) payload.source = input.source;

  return payload;
};

export const list = async (userId, weekStartDate) => {
  const sessions = await plannerRepository.findAllByUserAndWeek(
    userId,
    weekStartDate,
  );
  return serializePlannerSessionList(sessions);
};

export const getById = async (userId, sessionId) => {
  const session = await assertOwned(userId, sessionId);
  return serializePlannerSession(session);
};

export const create = async (userId, input) => {
  await validateSubject(userId, input.subjectId);
  await assertNotBlocked(
    userId,
    input.dayOfWeek,
    input.startHour,
    input.durationHours,
  );
  await assertNoOverlappingSession(
    userId,
    input.weekStartDate,
    input.dayOfWeek,
    input.startHour,
    input.durationHours,
  );

  const session = await plannerRepository.create(buildCreatePayload(userId, input));
  return serializePlannerSession(session);
};

export const update = async (userId, sessionId, input) => {
  const session = await assertOwned(userId, sessionId);
  const payload = buildUpdatePayload(input);

  if (payload.subjectId !== undefined && payload.subjectId !== null) {
    await validateSubject(userId, payload.subjectId);
  }

  const dayOfWeek = payload.dayOfWeek ?? session.dayOfWeek;
  const startHour = payload.startHour ?? session.startHour;
  const durationHours = payload.durationHours ?? session.durationHours;
  const weekStartDate = payload.weekStartDate ?? session.weekStartDate;

  await assertNotBlocked(userId, dayOfWeek, startHour, durationHours);
  await assertNoOverlappingSession(
    userId,
    weekStartDate,
    dayOfWeek,
    startHour,
    durationHours,
    session.id,
  );

  const updated = await plannerRepository.update(session, payload);
  return serializePlannerSession(updated);
};

export const remove = async (userId, sessionId) => {
  const session = await assertOwned(userId, sessionId);
  await plannerRepository.remove(session);
};
