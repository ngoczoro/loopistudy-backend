import ApiError from "../../../utils/ApiError.js";
import { getBlockedSlots } from "../../users/user.service.js";
import { assertOwned as assertSubjectOwned } from "../../subjects/subject.service.js";
import { serializeSubject } from "../../subjects/subject.serializer.js";
import * as plannerRepository from "../planner.repository.js";
import { EXAM_BUFFER_DAYS } from "./ai-plan.constants.js";
import {
  buildPlanSummary,
  buildReplacePreview,
  groupSessionsByWeek,
  resolvePlanStart,
  runScheduler,
} from "./ai-plan.scheduler.js";
import { getPlanEndDate, getWeekStartDate, toDateOnly } from "./ai-plan.weekUtils.js";
import { applyAiPlanSessions } from "./ai-plan.apply.js";
import { analyzeContentDocument } from "./ai-plan.analyze.js";
import { isAiPlanMockEnabled } from "./ai-plan.constants.js";
import { parseChatWithGemini } from "./ai-plan.gemini.js";
import { parseChatHeuristic } from "./ai-plan.chat-heuristic.js";
import { applyChatIntents } from "./ai-plan.intent.js";

const notImplemented = (feature, phase) => {
  throw new ApiError(501, `${feature} is not implemented yet (${phase})`);
};

const applySchedulingOverrides = (subject, overrides = []) => {
  const override = overrides.find((item) => item.subjectId === subject.id);
  if (!override) return subject;

  return {
    ...subject,
    ...(override.difficulty ? { difficulty: override.difficulty } : {}),
    ...(override.hoursPerWeek != null
      ? { requiredHoursPerWeek: override.hoursPerWeek }
      : {}),
    ...(override.examDate ? { examDate: toDateOnly(override.examDate) } : {}),
  };
};

const loadSubjectsForPlan = async (userId, subjectIds, schedulingOverrides = []) => {
  const subjects = [];

  for (const subjectId of subjectIds) {
    const record = await assertSubjectOwned(userId, subjectId);
    const serialized = serializeSubject(record);
    subjects.push(applySchedulingOverrides(serialized, schedulingOverrides));
  }

  return subjects;
};

const serializeExistingSessions = (sessions) =>
  sessions.map((session) => ({
    weekStartDate: session.weekStartDate,
    dayOfWeek: session.dayOfWeek,
    startHour: Number(session.startHour),
    durationHours: Number(session.durationHours),
    source: session.source,
    subjectId: session.subjectId ?? null,
  }));

/**
 * Generate a multi-week study plan preview.
 */
export const generate = async (userId, input) => {
  const subjectIds = [...new Set(input.subjectIds)];
  const subjects = await loadSubjectsForPlan(
    userId,
    subjectIds,
    input.schedulingOverrides ?? [],
  );

  if (input.examDate && subjectIds.length === 1) {
    subjects[0].examDate = toDateOnly(input.examDate);
  }

  const planStart = resolvePlanStart();
  const planEnd = subjects.reduce((latest, subject) => {
    if (!subject.examDate) return latest;
    const end = getPlanEndDate(subject.examDate, EXAM_BUFFER_DAYS);
    return end > latest ? end : latest;
  }, planStart);

  const fromWeek = getWeekStartDate(planStart);
  const toWeek = getWeekStartDate(planEnd);
  const blockedSlots = await getBlockedSlots(userId);
  const existingRows = await plannerRepository.findByUserWeekRange(
    userId,
    fromWeek,
    toWeek,
  );
  const existingSessions = serializeExistingSessions(existingRows);

  const { sessions, warnings } = runScheduler({
    subjects,
    planStart,
    blockedSlots,
    existingSessions,
    scopeSubjectIds: subjectIds,
    constraints: input.constraints ?? [],
  });

  return {
    planStart,
    planEnd,
    weeks: groupSessionsByWeek(sessions),
    summary: buildPlanSummary(sessions, subjects),
    replacePreview: buildReplacePreview(existingSessions, subjectIds, subjects),
    warnings,
  };
};

export const apply = async (userId, input) => {
  return applyAiPlanSessions(userId, input);
};

export const chat = async (userId, input) => {
  const subjectIds = [...new Set(input.subjectIds)];
  let schedulingOverrides = input.schedulingOverrides ?? [];
  let constraints = input.constraints ?? [];

  let subjects = await loadSubjectsForPlan(
    userId,
    subjectIds,
    schedulingOverrides,
  );

  if (isAiPlanMockEnabled()) {
    notImplemented("AI plan chat", "Phase 4 — set STUDY_PLAN_AI_MOCK=false and GEMINI_API_KEY");
  }

  let chatResult;
  try {
    chatResult = await parseChatWithGemini(input.message, {
      subjects,
      constraints,
      planContext: input.planContext,
    });
  } catch (error) {
    console.error(
      "[ai-plan] Gemini chat failed, using heuristic fallback:",
      error.message,
    );
    chatResult = parseChatHeuristic(input.message, { subjects, constraints });
  }

  if (chatResult.needsClarification) {
    return {
      reply: chatResult.clarificationQuestion || chatResult.reply,
      needsClarification: true,
      intents: chatResult.intents,
      schedulingOverrides,
      constraints,
    };
  }

  const applied = applyChatIntents({
    subjects,
    schedulingOverrides,
    constraints,
    intents: chatResult.intents,
  });

  schedulingOverrides = applied.schedulingOverrides;
  constraints = applied.constraints;

  subjects = await loadSubjectsForPlan(
    userId,
    subjectIds,
    schedulingOverrides,
  );
  subjects = subjects.map((subject) => {
    const patched = applied.subjects.find((item) => item.id === subject.id);
    if (!patched) return subject;
    return {
      ...subject,
      priority: patched.priority ?? subject.priority,
      difficulty: patched.difficulty ?? subject.difficulty,
    };
  });

  const planStart = resolvePlanStart();
  const planEnd = subjects.reduce((latest, subject) => {
    if (!subject.examDate) return latest;
    const end = getPlanEndDate(subject.examDate, EXAM_BUFFER_DAYS);
    return end > latest ? end : latest;
  }, planStart);

  const fromWeek = getWeekStartDate(planStart);
  const toWeek = getWeekStartDate(planEnd);
  const blockedSlots = await getBlockedSlots(userId);
  const existingRows = await plannerRepository.findByUserWeekRange(
    userId,
    fromWeek,
    toWeek,
  );
  const existingSessions = serializeExistingSessions(existingRows);

  const { sessions, warnings } = runScheduler({
    subjects,
    planStart,
    blockedSlots,
    existingSessions,
    scopeSubjectIds: subjectIds,
    constraints,
  });

  return {
    reply: chatResult.reply,
    needsClarification: false,
    intents: chatResult.intents,
    schedulingOverrides,
    constraints,
    planStart,
    planEnd,
    weeks: groupSessionsByWeek(sessions),
    summary: buildPlanSummary(sessions, subjects),
    replacePreview: buildReplacePreview(existingSessions, subjectIds, subjects),
    warnings,
  };
};

export const analyzeDocument = async (userId, input) => {
  return analyzeContentDocument(userId, input.documentId);
};
