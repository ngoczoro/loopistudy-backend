import ApiError from "../../utils/ApiError.js";
import { SUBJECT_DIFFICULTY } from "../../config/constants.js";
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_PRIORITY,
  DEFAULT_PROGRESS,
  DEFAULT_SUBJECT_COLORS,
} from "./subject.constants.js";
import * as subjectRepository from "./subject.repository.js";
import {
  serializeSubject,
  serializeSubjectList,
} from "./subject.serializer.js";

const normalizeDifficulty = (value) => {
  if (!value) return DEFAULT_DIFFICULTY;

  const map = {
    easy: SUBJECT_DIFFICULTY.EASY,
    medium: SUBJECT_DIFFICULTY.MEDIUM,
    hard: SUBJECT_DIFFICULTY.HARD,
    Easy: SUBJECT_DIFFICULTY.EASY,
    Medium: SUBJECT_DIFFICULTY.MEDIUM,
    Hard: SUBJECT_DIFFICULTY.HARD,
  };

  return map[value] || value;
};

const normalizePriority = (value) => {
  if (!value) return DEFAULT_PRIORITY;
  return String(value).toLowerCase();
};

const pickColor = async (userId, providedColor) => {
  if (providedColor) return providedColor;

  const count = await subjectRepository.countByUserId(userId);
  return DEFAULT_SUBJECT_COLORS[count % DEFAULT_SUBJECT_COLORS.length];
};

const assertUniqueName = async (userId, name, excludeId = null) => {
  const existing = await subjectRepository.findByNameAndUserId(
    name.trim(),
    userId,
    excludeId,
  );

  if (existing) {
    throw ApiError.conflict("A subject with this name already exists");
  }
};

const buildCreatePayload = async (userId, input) => ({
  userId,
  name: input.name.trim(),
  credits: input.credits ?? null,
  difficulty: normalizeDifficulty(input.difficulty),
  examDate: input.examDate ?? null,
  color: await pickColor(userId, input.color),
  priority: normalizePriority(input.priority),
  requiredHoursPerWeek: input.requiredHoursPerWeek ?? null,
  progress: input.progress ?? DEFAULT_PROGRESS,
});

const buildUpdatePayload = (input) => {
  const payload = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.credits !== undefined) payload.credits = input.credits;
  if (input.difficulty !== undefined) {
    payload.difficulty = normalizeDifficulty(input.difficulty);
  }
  if (input.examDate !== undefined) payload.examDate = input.examDate;
  if (input.color !== undefined) payload.color = input.color;
  if (input.priority !== undefined) {
    payload.priority = normalizePriority(input.priority);
  }
  if (input.requiredHoursPerWeek !== undefined) {
    payload.requiredHoursPerWeek = input.requiredHoursPerWeek;
  }
  if (input.progress !== undefined) payload.progress = input.progress;

  return payload;
};

export const assertOwned = async (userId, subjectId) => {
  const subject = await subjectRepository.findByIdAndUserId(subjectId, userId);

  if (!subject) {
    throw ApiError.notFound("Subject not found or you don't have permission");
  }

  return subject;
};

export const list = async (userId) => {
  const subjects = await subjectRepository.findAllByUserId(userId);
  return serializeSubjectList(subjects);
};

export const getById = async (userId, subjectId) => {
  const subject = await assertOwned(userId, subjectId);
  return serializeSubject(subject);
};

export const create = async (userId, input) => {
  await assertUniqueName(userId, input.name);
  const payload = await buildCreatePayload(userId, input);
  const subject = await subjectRepository.create(payload);
  return serializeSubject(subject);
};

export const update = async (userId, subjectId, input) => {
  const subject = await assertOwned(userId, subjectId);
  const payload = buildUpdatePayload(input);

  if (payload.name) {
    await assertUniqueName(userId, payload.name, subjectId);
  }

  const updated = await subjectRepository.update(subject, payload);
  return serializeSubject(updated);
};

export const remove = async (userId, subjectId) => {
  const subject = await assertOwned(userId, subjectId);
  await subjectRepository.softDelete(subject);
};
