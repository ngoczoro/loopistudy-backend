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

const sessionOverlapsBlockedSlot = (
  dayOfWeek,
  startHour,
  durationHours,
  blockedSlots,
) => {
  const start = toNumber(startHour);
  const end = start + toNumber(durationHours);

  for (const slot of blockedSlots) {
    const slotDay =
      typeof slot.day === "string" ? dayLabelToNumber(slot.day) : slot.day;

    if (slotDay !== dayOfWeek) {
      continue;
    }

    const blockedStart = slot.hour;
    const blockedEnd = blockedStart + 1;

    if (start < blockedEnd && end > blockedStart) {
      return true;
    }
  }

  return false;
};

const assertNotBlocked = async (userId, dayOfWeek, startHour, durationHours) => {
  const blockedSlots = await getBlockedSlots(userId);

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

  await assertNotBlocked(userId, dayOfWeek, startHour, durationHours);

  const updated = await plannerRepository.update(session, payload);
  return serializePlannerSession(updated);
};

export const remove = async (userId, sessionId) => {
  const session = await assertOwned(userId, sessionId);
  await plannerRepository.remove(session);
};
