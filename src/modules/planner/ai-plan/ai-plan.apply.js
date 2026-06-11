import sequelize from "../../../config/database.js";
import ApiError from "../../../utils/ApiError.js";
import { getBlockedSlots } from "../../users/user.service.js";
import { assertOwned as assertSubjectOwned } from "../../subjects/subject.service.js";
import * as plannerRepository from "../planner.repository.js";
import {
  assertSessionNoOverlap,
  assertSessionNotBlocked,
  toOverlapSessionShape,
} from "../planner.conflict.js";

const AI_PLAN_SOURCE = "ai_plan";

const countReplaceBySubject = (existingRows, subjectIds) => {
  const scopeSet = new Set(subjectIds);
  const counts = new Map(subjectIds.map((id) => [id, 0]));

  for (const row of existingRows) {
    if (row.source !== AI_PLAN_SOURCE) continue;
    if (!row.subjectId || !scopeSet.has(row.subjectId)) continue;
    counts.set(row.subjectId, (counts.get(row.subjectId) ?? 0) + 1);
  }

  return counts;
};

const buildObstaclesByWeek = (existingRows, subjectIds) => {
  const scopeSet = new Set(subjectIds);
  const byWeek = new Map();

  for (const row of existingRows) {
    const isScopedAiPlan =
      row.source === AI_PLAN_SOURCE &&
      row.subjectId &&
      scopeSet.has(row.subjectId);

    if (isScopedAiPlan) continue;

    const week = row.weekStartDate;
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(toOverlapSessionShape(row));
  }

  return byWeek;
};

const validateBatchSessions = (sessions, obstaclesByWeek, blockedSlots) => {
  const batchByWeek = new Map();

  for (const session of sessions) {
    const week = session.weekStartDate;
    const weekObstacles = obstaclesByWeek.get(week) ?? [];
    const batchSoFar = batchByWeek.get(week) ?? [];

    assertSessionNotBlocked(
      session.dayOfWeek,
      session.startHour,
      session.durationHours,
      blockedSlots,
    );
    assertSessionNoOverlap(
      session.dayOfWeek,
      session.startHour,
      session.durationHours,
      [...weekObstacles, ...batchSoFar],
    );

    batchSoFar.push(toOverlapSessionShape(session));
    batchByWeek.set(week, batchSoFar);
  }
};

const buildPlannerRow = (userId, session) => ({
  userId,
  title: session.title.trim(),
  subjectId: session.subjectId,
  dayOfWeek: session.dayOfWeek,
  startHour: session.startHour,
  durationHours: session.durationHours,
  color: session.color || null,
  weekStartDate: session.weekStartDate,
  source: AI_PLAN_SOURCE,
});

/**
 * Apply scoped overwrite: replace ai_plan sessions for selected subjects,
 * then bulk insert the preview sessions.
 */
export const applyAiPlanSessions = async (userId, { subjectIds, sessions }) => {
  const uniqueSubjectIds = [...new Set(subjectIds)];

  if (!uniqueSubjectIds.length) {
    throw ApiError.badRequest("At least one subject is required");
  }

  if (!sessions?.length) {
    throw ApiError.badRequest("At least one session is required to apply");
  }

  for (const subjectId of uniqueSubjectIds) {
    await assertSubjectOwned(userId, subjectId);
  }

  const scopeSet = new Set(uniqueSubjectIds);
  for (const session of sessions) {
    if (!session.subjectId || !scopeSet.has(session.subjectId)) {
      throw ApiError.badRequest(
        "Every session must belong to one of the selected subjects",
      );
    }
  }

  const weekStarts = [...new Set(sessions.map((s) => s.weekStartDate))].sort();
  const fromWeek = weekStarts[0];
  const toWeek = weekStarts[weekStarts.length - 1];

  const existingRows = await plannerRepository.findByUserWeekRange(
    userId,
    fromWeek,
    toWeek,
  );
  const replaceCounts = countReplaceBySubject(existingRows, uniqueSubjectIds);
  const obstaclesByWeek = buildObstaclesByWeek(existingRows, uniqueSubjectIds);
  const blockedSlots = await getBlockedSlots(userId);

  validateBatchSessions(sessions, obstaclesByWeek, blockedSlots);

  const rows = sessions.map((session) => buildPlannerRow(userId, session));

  await sequelize.transaction(async (transaction) => {
    await plannerRepository.deleteAiPlanBySubjectIds(
      userId,
      uniqueSubjectIds,
      transaction,
    );
    await plannerRepository.bulkCreate(rows, transaction);
  });

  const replaced = uniqueSubjectIds.map((subjectId) => ({
    subjectId,
    count: replaceCounts.get(subjectId) ?? 0,
  }));

  return {
    created: rows.length,
    replaced,
  };
};
