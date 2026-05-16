import sequelize from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  buildSuccessResponse,
  buildPaginationResponse,
  getPaginationParams,
} from "../utils/response.js";

const { User, Subject } = sequelize.models || {};

/**
 * Create a new subject
 * POST /api/v1/subjects
 */
export const createSubject = asyncHandler(async (req, res) => {
  const { title, description, color, difficulty, targetHours } = req.body;
  const userId = req.user.userId;

  const subject = await Subject.create({
    userId,
    title,
    description,
    color,
    difficulty,
    targetHours,
    status: "active",
  });

  res
    .status(201)
    .json(buildSuccessResponse("Subject created successfully", subject));
});

/**
 * Get all subjects for current user
 * GET /api/v1/subjects
 */
export const getSubjects = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { status } = req.query;
  const { page, limit, offset } = getPaginationParams(req.query);

  const where = { userId };
  if (status) {
    where.status = status;
  }

  const { count, rows } = await Subject.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  const pagination = buildPaginationResponse(rows, count, page, limit);

  res.json(
    buildSuccessResponse(
      "Subjects fetched successfully",
      pagination.data,
      pagination.pagination,
    ),
  );
});

/**
 * Get single subject
 * GET /api/v1/subjects/:id
 */
export const getSubjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const subject = await Subject.findOne({
    where: { id, userId },
  });

  if (!subject) {
    throw ApiError.notFound("Subject not found");
  }

  res.json(buildSuccessResponse("Subject fetched successfully", subject));
});

/**
 * Update subject
 * PUT /api/v1/subjects/:id
 */
export const updateSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const updateData = req.body;

  const subject = await Subject.findOne({
    where: { id, userId },
  });

  if (!subject) {
    throw ApiError.notFound("Subject not found");
  }

  await subject.update(updateData);

  res.json(buildSuccessResponse("Subject updated successfully", subject));
});

/**
 * Delete subject
 * DELETE /api/v1/subjects/:id
 */
export const deleteSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const subject = await Subject.findOne({
    where: { id, userId },
  });

  if (!subject) {
    throw ApiError.notFound("Subject not found");
  }

  await subject.destroy();

  res.json(buildSuccessResponse("Subject deleted successfully"));
});

/**
 * Get subject statistics
 * GET /api/v1/subjects/:id/stats
 */
export const getSubjectStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const subject = await Subject.findOne({
    where: { id, userId },
    include: [
      {
        model: sequelize.models.StudySession,
        as: "sessions",
        attributes: ["actualDurationMinutes", "status"],
        required: false,
      },
    ],
  });

  if (!subject) {
    throw ApiError.notFound("Subject not found");
  }

  // Calculate stats
  const completedSessions = subject.sessions.filter(
    (s) => s.status === "completed",
  ).length;
  const totalMinutes = subject.sessions.reduce(
    (sum, s) => sum + (s.actualDurationMinutes || 0),
    0,
  );
  const totalHours = (totalMinutes / 60).toFixed(2);
  const completionPercentage =
    subject.targetHours > 0
      ? Math.round((totalHours / subject.targetHours) * 100)
      : 0;

  const stats = {
    ...subject.toJSON(),
    completedSessions,
    totalHours: parseFloat(totalHours),
    completionPercentage,
    averageSessionDuration:
      completedSessions > 0 ? Math.round(totalMinutes / completedSessions) : 0,
  };

  res.json(
    buildSuccessResponse("Subject statistics fetched successfully", stats),
  );
});
