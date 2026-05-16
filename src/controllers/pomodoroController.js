import sequelize from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse } from "../utils/response.js";
import { POMODORO } from "../config/constants.js";

const { PomodoroSession, StudySession } = sequelize.models || {};

/**
 * Start a pomodoro session
 * POST /api/v1/pomodoro/start
 */
export const startPomodoroSession = asyncHandler(async (req, res) => {
  const { studySessionId, sessionNumber = 1 } = req.body;
  const userId = req.user.userId;

  // Verify study session exists and belongs to user
  const studySession = await StudySession.findOne({
    where: { id: studySessionId, userId },
  });

  if (!studySession) {
    throw ApiError.notFound("Study session not found");
  }

  // Create pomodoro session
  const pomodoroSession = await PomodoroSession.create({
    userId,
    studySessionId,
    sessionNumber,
    startTime: new Date(),
    durationMinutes: POMODORO.WORK_DURATION,
    breakTimeMinutes: POMODORO.BREAK_DURATION,
    isCompleted: false,
  });

  // Update study session status
  await studySession.update({ status: "active" });

  res
    .status(201)
    .json(buildSuccessResponse("Pomodoro session started", pomodoroSession));
});

/**
 * Pause pomodoro session
 * POST /api/v1/pomodoro/:id/pause
 */
export const pausePomodoroSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const pomodoroSession = await PomodoroSession.findOne({
    where: { id, userId },
  });

  if (!pomodoroSession) {
    throw ApiError.notFound("Pomodoro session not found");
  }

  if (pomodoroSession.isCompleted) {
    throw ApiError.badRequest("Cannot pause a completed session");
  }

  // Increment pause count
  await pomodoroSession.update({
    pauseCount: pomodoroSession.pauseCount + 1,
  });

  res.json(buildSuccessResponse("Pomodoro session paused", pomodoroSession));
});

/**
 * Resume pomodoro session
 * POST /api/v1/pomodoro/:id/resume
 */
export const resumePomodoroSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const pomodoroSession = await PomodoroSession.findOne({
    where: { id, userId },
  });

  if (!pomodoroSession) {
    throw ApiError.notFound("Pomodoro session not found");
  }

  if (pomodoroSession.isCompleted) {
    throw ApiError.badRequest("Cannot resume a completed session");
  }

  res.json(buildSuccessResponse("Pomodoro session resumed", pomodoroSession));
});

/**
 * Complete pomodoro session
 * POST /api/v1/pomodoro/:id/complete
 */
export const completePomodoroSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const { actualWorkTimeMinutes } = req.body;

  const pomodoroSession = await PomodoroSession.findOne({
    where: { id, userId },
  });

  if (!pomodoroSession) {
    throw ApiError.notFound("Pomodoro session not found");
  }

  if (pomodoroSession.isCompleted) {
    throw ApiError.badRequest("Session already completed");
  }

  // Update session
  await pomodoroSession.update({
    endTime: new Date(),
    isCompleted: true,
    actualWorkTimeMinutes: actualWorkTimeMinutes || POMODORO.WORK_DURATION,
  });

  // Get study session
  const studySession = await StudySession.findByPk(
    pomodoroSession.studySessionId,
  );
  if (studySession) {
    // Update actual duration in study session
    const totalMinutes =
      (studySession.actualDurationMinutes || 0) +
      (actualWorkTimeMinutes || POMODORO.WORK_DURATION);
    await studySession.update({
      actualDurationMinutes: totalMinutes,
    });
  }

  res.json(buildSuccessResponse("Pomodoro session completed", pomodoroSession));
});

/**
 * Get pomodoro session stats
 * GET /api/v1/pomodoro/stats
 */
export const getPomodoroStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { fromDate, toDate } = req.query;

  const where = { userId, isCompleted: true };

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt[sequelize.Sequelize.Op.gte] = new Date(fromDate);
    }
    if (toDate) {
      where.createdAt[sequelize.Sequelize.Op.lte] = new Date(toDate);
    }
  }

  const sessions = await PomodoroSession.findAll({
    where,
    attributes: [
      "id",
      "durationMinutes",
      "actualWorkTimeMinutes",
      "pauseCount",
      "createdAt",
    ],
  });

  const stats = {
    totalSessions: sessions.length,
    totalMinutes: sessions.reduce(
      (sum, s) => sum + (s.actualWorkTimeMinutes || s.durationMinutes),
      0,
    ),
    totalHours: (
      sessions.reduce(
        (sum, s) => sum + (s.actualWorkTimeMinutes || s.durationMinutes),
        0,
      ) / 60
    ).toFixed(2),
    averagePauseCount:
      sessions.length > 0
        ? (
            sessions.reduce((sum, s) => sum + s.pauseCount, 0) / sessions.length
          ).toFixed(2)
        : 0,
  };

  res.json(buildSuccessResponse("Pomodoro statistics fetched", stats));
});
