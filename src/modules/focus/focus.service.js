import {
  FOCUS_SESSION_PHASE,
  FOCUS_SESSION_STATUS,
} from "../../config/constants.js";
import sequelize from "../../config/database.js";
import ApiError from "../../utils/ApiError.js";
import * as plannerRepository from "../planner/planner.repository.js";
import * as subjectRepository from "../subjects/subject.repository.js";
import * as focusRepository from "./focus.repository.js";
import { serializeFocusSession, serializeFocusSessionList } from "./focus.serializer.js";

const STALE_SESSION_MS = 48 * 60 * 60 * 1000;

const models = () => sequelize.models;

const normalizeSubjectId = (subjectId) => {
  if (subjectId === undefined || subjectId === null || subjectId === "") {
    return null;
  }
  return subjectId;
};

const attachSubject = async (session, userId) => {
  if (!session.subjectId) {
    session.subject = null;
    return session;
  }

  const subject = await subjectRepository.findByIdAndUserId(
    session.subjectId,
    userId,
  );
  session.subject = subject;
  return session;
};

const assertSubjectOwned = async (userId, subjectId) => {
  const subject = await subjectRepository.findByIdAndUserId(subjectId, userId);

  if (!subject) {
    throw ApiError.notFound("Subject not found");
  }

  return subject;
};

const assertPlannerSessionOwned = async (userId, plannerSessionId) => {
  if (!plannerSessionId) {
    return null;
  }

  const session = await plannerRepository.findByIdAndUserId(
    plannerSessionId,
    userId,
  );

  if (!session) {
    throw ApiError.notFound("Planner session not found");
  }

  return session;
};

const assertMutableSession = (session) => {
  if (
    session.status !== FOCUS_SESSION_STATUS.RUNNING &&
    session.status !== FOCUS_SESSION_STATUS.PAUSED
  ) {
    throw ApiError.badRequest(
      `Cannot modify a session with status "${session.status}"`,
    );
  }
};

const phaseEndsAtFromRemaining = (remainingSeconds) =>
  new Date(Date.now() + remainingSeconds * 1000);

const computeRemainingFromSession = (session) => {
  if (session.status === FOCUS_SESSION_STATUS.PAUSED) {
    return Math.max(0, session.remainingSeconds ?? 0);
  }

  if (session.status === FOCUS_SESSION_STATUS.RUNNING && session.phaseEndsAt) {
    const ms = new Date(session.phaseEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }

  return Math.max(0, session.remainingSeconds ?? 0);
};

const isSessionStale = (session) => {
  const anchor = session.pausedAt ?? session.startedAt ?? session.updatedAt;

  if (!anchor) {
    return false;
  }

  return Date.now() - new Date(anchor).getTime() > STALE_SESSION_MS;
};

const findSessionForUpdate = async (sessionId, userId, transaction) => {
  const { FocusSession } = models();

  return FocusSession.findOne({
    where: { id: sessionId, userId },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
};

const findUnfinishedByUserAndSubjectForUpdate = async (
  userId,
  subjectId,
  transaction,
) => {
  const { FocusSession } = models();
  const { Op } = sequelize.Sequelize;

  const subjectKey = normalizeSubjectId(subjectId);

  return FocusSession.findOne({
    where: {
      userId,
      subjectId:
        subjectKey === null ? { [Op.is]: null } : subjectKey,
      status: {
        [Op.in]: [FOCUS_SESSION_STATUS.RUNNING, FOCUS_SESSION_STATUS.PAUSED],
      },
    },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
};

const resolveWorkElapsedForCompletion = (session) => {
  const stored = session.workElapsedSeconds ?? 0;
  const plannedSec = (session.plannedWorkMinutes ?? 0) * 60;
  const phase = session.currentPhase ?? FOCUS_SESSION_PHASE.WORK;

  if (
    session.status === FOCUS_SESSION_STATUS.RUNNING &&
    phase === FOCUS_SESSION_PHASE.WORK &&
    plannedSec > 0
  ) {
    const remainingSeconds = computeRemainingFromSession(session);
    return Math.max(stored, plannedSec - remainingSeconds);
  }

  return stored;
};

/**
 * TRANSACTION BOUNDARY (internal): complete every unfinished session except
 * `exceptSessionId` so only one live workspace remains.
 */
const completeOtherUnfinishedSessions = async (
  userId,
  exceptSessionId,
  transaction,
) => {
  const { FocusSession } = models();
  const { Op } = sequelize.Sequelize;

  const where = {
    userId,
    status: {
      [Op.in]: [FOCUS_SESSION_STATUS.RUNNING, FOCUS_SESSION_STATUS.PAUSED],
    },
  };

  if (exceptSessionId) {
    where.id = { [Op.ne]: exceptSessionId };
  }

  const others = await FocusSession.findAll({
    where,
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  for (const session of others) {
    const workElapsedSeconds = resolveWorkElapsedForCompletion(session);
    const actualWorkMinutes = Math.max(
      0,
      Math.ceil(workElapsedSeconds / 60),
    );

    await session.update(
      {
        status: FOCUS_SESSION_STATUS.COMPLETED,
        actualWorkMinutes,
        workElapsedSeconds,
        completedAt: new Date(),
        pausedAt: null,
        phaseEndsAt: null,
        remainingSeconds: 0,
      },
      { transaction },
    );
  }
};

/**
 * TRANSACTION BOUNDARY (internal): transition one workspace row to running after
 * other running timers have been auto-paused.
 */
const activateWorkspaceAsRunning = async (session, userId, transaction) => {
  const now = new Date();
  let totalPausedSeconds = session.totalPausedSeconds ?? 0;

  if (session.pausedAt) {
    totalPausedSeconds += Math.max(
      0,
      Math.floor((now.getTime() - new Date(session.pausedAt).getTime()) / 1000),
    );
  }

  const remainingSeconds = Math.max(0, session.remainingSeconds ?? 0);

  await session.update(
    {
      status: FOCUS_SESSION_STATUS.RUNNING,
      pausedAt: null,
      totalPausedSeconds,
      remainingSeconds,
      phaseEndsAt: phaseEndsAtFromRemaining(remainingSeconds),
    },
    { transaction },
  );

  await session.reload({ transaction });
  return attachSubject(session, userId);
};

/**
 * Create or return the unfinished workspace for a subject. Never throws 409 for an
 * existing workspace on the same subject.
 */
export const createOrResumeWorkspace = async (userId, input) => {
  const subjectId = normalizeSubjectId(input.subjectId);

  if (subjectId) {
    await assertSubjectOwned(userId, subjectId);
  }

  await assertPlannerSessionOwned(userId, input.plannerSessionId ?? null);

  const existing = await focusRepository.findUnfinishedByUserAndSubject(
    userId,
    subjectId,
  );

  if (existing) {
    if (existing.status === FOCUS_SESSION_STATUS.RUNNING) {
      const withSubject = await attachSubject(existing, userId);
      return serializeFocusSession(withSubject);
    }

    return resumeSession(userId, existing.id);
  }

  const notes =
    input.notes && String(input.notes).trim() ? String(input.notes).trim() : null;

  const workSeconds = input.plannedWorkMinutes * 60;

  // TRANSACTION START → create running workspace + auto-complete other sessions
  const session = await sequelize.transaction(async (transaction) => {
    const raced = await findUnfinishedByUserAndSubjectForUpdate(
      userId,
      subjectId,
      transaction,
    );

    if (raced) {
      return raced;
    }

    await completeOtherUnfinishedSessions(userId, null, transaction);

    const { FocusSession } = models();

    return FocusSession.create(
      {
        userId,
        subjectId,
        plannerSessionId: input.plannerSessionId ?? null,
        status: FOCUS_SESSION_STATUS.RUNNING,
        sessionNumber: 1,
        plannedWorkMinutes: input.plannedWorkMinutes,
        plannedBreakMinutes: input.plannedBreakMinutes ?? null,
        notes,
        startedAt: new Date(),
        currentPhase: FOCUS_SESSION_PHASE.WORK,
        remainingSeconds: workSeconds,
        phaseEndsAt: phaseEndsAtFromRemaining(workSeconds),
        workElapsedSeconds: 0,
        totalPausedSeconds: 0,
      },
      { transaction },
    );
  });
  // TRANSACTION END

  if (session.status === FOCUS_SESSION_STATUS.PAUSED) {
    return resumeSession(userId, session.id);
  }

  const withSubject = await attachSubject(session, userId);
  return serializeFocusSession(withSubject);
};

export const createSession = async (userId, input) =>
  createOrResumeWorkspace(userId, input);

export const listUnfinishedWorkspaces = async (userId) => {
  const rows = await focusRepository.findUnfinishedWithSubject(userId);

  return rows.map((session) => ({
    ...serializeFocusSession(session),
    isStale: isSessionStale(session),
  }));
};

/**
 * Legacy /active shim: prefer the globally running timer; otherwise first unfinished workspace.
 */
export const getActiveSession = async (userId) => {
  const running = await focusRepository.findRunningByUserId(userId);

  if (running) {
    const withSubject = await attachSubject(running, userId);
    return {
      ...serializeFocusSession(withSubject),
      isStale: isSessionStale(running),
    };
  }

  const unfinished = await focusRepository.findUnfinishedWithSubject(userId);

  if (unfinished.length === 0) {
    return null;
  }

  const fallback = unfinished[0];

  return {
    ...serializeFocusSession(fallback),
    isStale: isSessionStale(fallback),
  };
};

export const pauseSession = async (userId, sessionId, input) => {
  const session = await focusRepository.findByIdAndUserId(sessionId, userId);

  if (!session) {
    throw ApiError.notFound("Focus session not found");
  }

  assertMutableSession(session);

  if (session.status === FOCUS_SESSION_STATUS.PAUSED) {
    const withSubject = await attachSubject(session, userId);
    return serializeFocusSession(withSubject);
  }

  const remainingSeconds =
    input.remainingSeconds ?? computeRemainingFromSession(session);
  const workElapsedSeconds =
    input.workElapsedSeconds ?? session.workElapsedSeconds ?? 0;
  const currentPhase =
    input.currentPhase ?? session.currentPhase ?? FOCUS_SESSION_PHASE.WORK;

  const updated = await focusRepository.update(session, {
    status: FOCUS_SESSION_STATUS.PAUSED,
    pausedAt: new Date(),
    phaseEndsAt: null,
    remainingSeconds,
    workElapsedSeconds,
    currentPhase,
  });

  const withSubject = await attachSubject(updated, userId);
  return serializeFocusSession(withSubject);
};

export const resumeSession = async (userId, sessionId) => {
  // TRANSACTION START → lock target row, auto-complete other unfinished, activate
  const withSubject = await sequelize.transaction(async (transaction) => {
    const session = await findSessionForUpdate(sessionId, userId, transaction);

    if (!session) {
      throw ApiError.notFound("Focus session not found");
    }

    assertMutableSession(session);

    if (session.status === FOCUS_SESSION_STATUS.RUNNING) {
      return attachSubject(session, userId);
    }

    await completeOtherUnfinishedSessions(userId, session.id, transaction);

    return activateWorkspaceAsRunning(session, userId, transaction);
  });
  // TRANSACTION END

  return serializeFocusSession(withSubject);
};

export const syncSession = async (userId, sessionId, input) => {
  const session = await focusRepository.findByIdAndUserId(sessionId, userId);

  if (!session) {
    throw ApiError.notFound("Focus session not found");
  }

  if (session.status !== FOCUS_SESSION_STATUS.RUNNING) {
    const withSubject = await attachSubject(session, userId);
    return serializeFocusSession(withSubject);
  }

  const remainingSeconds =
    input.remainingSeconds ?? computeRemainingFromSession(session);
  const workElapsedSeconds =
    input.workElapsedSeconds ?? session.workElapsedSeconds ?? 0;
  const currentPhase =
    input.currentPhase ?? session.currentPhase ?? FOCUS_SESSION_PHASE.WORK;

  const updated = await focusRepository.update(session, {
    remainingSeconds,
    workElapsedSeconds,
    currentPhase,
    phaseEndsAt: phaseEndsAtFromRemaining(remainingSeconds),
  });

  const withSubject = await attachSubject(updated, userId);
  return serializeFocusSession(withSubject);
};

export const completeSession = async (userId, sessionId, input = {}) => {
  const session = await focusRepository.findByIdAndUserId(sessionId, userId);

  if (!session) {
    throw ApiError.notFound("Focus session not found");
  }

  assertMutableSession(session);

  const workElapsedSeconds =
    input.workElapsedSeconds ?? session.workElapsedSeconds ?? 0;
  const actualWorkMinutes =
    input.actualWorkMinutes ??
    (Math.max(0, Math.ceil(workElapsedSeconds / 60)) ||
      session.plannedWorkMinutes ||
      0);

  const updated = await focusRepository.update(session, {
    status: FOCUS_SESSION_STATUS.COMPLETED,
    actualWorkMinutes,
    workElapsedSeconds,
    completedAt: new Date(),
    pausedAt: null,
    phaseEndsAt: null,
    remainingSeconds: 0,
  });

  const withSubject = await attachSubject(updated, userId);
  return serializeFocusSession(withSubject);
};

export const abandonSession = async (userId, sessionId, input) => {
  const session = await focusRepository.findByIdAndUserId(sessionId, userId);

  if (!session) {
    throw ApiError.notFound("Focus session not found");
  }

  assertMutableSession(session);

  const workElapsedSeconds =
    input.workElapsedSeconds ?? session.workElapsedSeconds ?? 0;
  const actualWorkMinutes =
    input.actualWorkMinutes ?? Math.max(0, Math.ceil(workElapsedSeconds / 60));

  const updated = await focusRepository.update(session, {
    status: FOCUS_SESSION_STATUS.CANCELLED,
    actualWorkMinutes,
    workElapsedSeconds,
    completedAt: new Date(),
    pausedAt: null,
    phaseEndsAt: null,
    remainingSeconds: 0,
  });

  const withSubject = await attachSubject(updated, userId);
  return serializeFocusSession(withSubject);
};

/**
 * Hard-delete an unfinished workspace (running|paused). No analytics/history row retained.
 */
export const discardUnfinishedWorkspace = async (userId, sessionId) => {
  const session = await focusRepository.findByIdAndUserId(sessionId, userId);

  if (!session) {
    throw ApiError.notFound("Focus session not found");
  }

  assertMutableSession(session);

  await session.destroy();
};

export const getHistory = async (userId) => {
  const rows = await focusRepository.findHistoryByUserId(userId);
  return serializeFocusSessionList(rows);
};
