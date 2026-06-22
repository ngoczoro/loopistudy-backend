import ApiError from "../../utils/ApiError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { revokeAllUserRefreshTokens } from "../auth/auth.service.js";
import {
  dayLabelToNumber,
  DEFAULT_BREAK_DURATION_MIN,
  DEFAULT_MAX_STUDY_HOURS_PER_DAY,
  DEFAULT_POMODORO_DURATION_MIN,
} from "./user.constants.js";
import * as userRepository from "./user.repository.js";
import {
  serializeBlockedSlotList,
  serializeUser,
  serializeUserPreferences,
} from "./user.serializer.js";

const assertUserExists = async (userId) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return user;
};

const getOrCreatePreferences = async (userId) =>
  userRepository.findOrCreatePreferences(userId, {
    pomodoroDurationMin: DEFAULT_POMODORO_DURATION_MIN,
    breakDurationMin: DEFAULT_BREAK_DURATION_MIN,
    maxStudyHoursPerDay: DEFAULT_MAX_STUDY_HOURS_PER_DAY,
  });

const buildProfileUpdatePayload = (input) => {
  const payload = {};

  if (input.fullName !== undefined) {
    payload.fullName = input.fullName.trim();
  }

  if (input.email !== undefined) {
    payload.email = input.email.trim().toLowerCase();
  }

  if (input.avatarUrl !== undefined) {
    payload.avatarUrl = input.avatarUrl || null;
  }

  return payload;
};

const buildPreferencesUpdatePayload = (input) => {
  const payload = {};

  if (input.pomodoroDuration !== undefined) {
    payload.pomodoroDurationMin = input.pomodoroDuration;
  }

  if (input.breakDuration !== undefined) {
    payload.breakDurationMin = input.breakDuration;
  }

  if (input.notifications?.taskReminders !== undefined) {
    payload.notifyTaskReminders = input.notifications.taskReminders;
  }

  if (input.notifications?.sessionReminders !== undefined) {
    payload.notifySessionReminders = input.notifications.sessionReminders;
  }

  if (input.notifications?.deadlineAlerts !== undefined) {
    payload.notifyDeadlineAlerts = input.notifications.deadlineAlerts;
  }

  if (input.maxStudyHoursPerDay !== undefined) {
    payload.maxStudyHoursPerDay = input.maxStudyHoursPerDay;
  }

  return payload;
};

const normalizeBlockedSlots = (slots) => {
  const seen = new Set();
  const normalized = [];

  for (const slot of slots) {
    const dayOfWeek = dayLabelToNumber(slot.day);

    if (dayOfWeek === null) {
      throw ApiError.badRequest(`Invalid day: ${slot.day}`);
    }

    const key = `${dayOfWeek}-${slot.hour}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({ dayOfWeek, hour: slot.hour });
  }

  return normalized;
};

export const getProfile = async (userId) => {
  const user = await assertUserExists(userId);
  return serializeUser(user);
};

export const updateProfile = async (userId, input) => {
  const user = await assertUserExists(userId);
  const payload = buildProfileUpdatePayload(input);

  if (payload.email && payload.email !== user.email) {
    const existing = await userRepository.findUserByEmail(payload.email);

    if (existing && existing.id !== userId) {
      throw ApiError.conflict("Email already in use");
    }
  }

  const updated = await userRepository.updateUser(user, payload);
  return serializeUser(updated);
};

export const getPreferences = async (userId) => {
  await assertUserExists(userId);
  const prefs = await getOrCreatePreferences(userId);
  return serializeUserPreferences(prefs);
};

export const updatePreferences = async (userId, input) => {
  await assertUserExists(userId);
  const prefs = await getOrCreatePreferences(userId);
  const payload = buildPreferencesUpdatePayload(input);

  if (Object.keys(payload).length === 0) {
    throw ApiError.badRequest(
      "At least one preference field is required to update",
    );
  }

  const updated = await userRepository.updatePreferences(prefs, payload);
  return serializeUserPreferences(updated);
};

export const getBlockedSlots = async (userId) => {
  await assertUserExists(userId);
  const slots = await userRepository.findAllBlockedSlotsByUserId(userId);
  return serializeBlockedSlotList(slots);
};

export const replaceBlockedSlots = async (userId, slots) => {
  await assertUserExists(userId);
  const normalized = normalizeBlockedSlots(slots);
  const rows = await userRepository.replaceBlockedSlotsForUser(
    userId,
    normalized,
  );
  return serializeBlockedSlotList(rows);
};

export const changePassword = async (userId, input) => {
  const user = await assertUserExists(userId);

  const isCurrentValid = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isCurrentValid) {
    throw ApiError.unauthorized("Current password is incorrect");
  }

  const isSamePassword = await verifyPassword(
    input.newPassword,
    user.passwordHash,
  );

  if (isSamePassword) {
    throw ApiError.badRequest(
      "New password must be different from current password",
    );
  }

  const passwordHash = await hashPassword(input.newPassword);
  await userRepository.updateUser(user, { passwordHash });
  await revokeAllUserRefreshTokens(userId);
};
