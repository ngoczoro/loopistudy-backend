import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import { serializeFocusSessionList } from "./focus.serializer.js";
import * as analyticsService from "./focus.analytics.service.js";

export const analyticsSummary = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSummary(req.user.userId, req.query);
  res.json(buildSuccessResponse("Focus analytics summary fetched successfully", data));
});

export const analyticsTrends = asyncHandler(async (req, res) => {
  const data = await analyticsService.getTrends(req.user.userId, req.query);
  res.json(buildSuccessResponse("Focus analytics trends fetched successfully", data));
});

export const analyticsSubjects = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSubjectStats(req.user.userId, req.query);
  res.json(buildSuccessResponse("Focus subject statistics fetched successfully", data));
});

export const analyticsStreak = asyncHandler(async (req, res) => {
  const data = await analyticsService.getStreak(req.user.userId);
  res.json(buildSuccessResponse("Focus streak fetched successfully", data));
});

export const analyticsPlanner = asyncHandler(async (req, res) => {
  const data = await analyticsService.getPlannerInsights(req.user.userId, req.query);
  res.json(buildSuccessResponse("Planner focus insights fetched successfully", data));
});

export const filteredHistory = asyncHandler(async (req, res) => {
  const result = await analyticsService.getFilteredHistory(req.user.userId, req.query);
  const serialized = serializeFocusSessionList(result.sessions);

  let groups = null;
  if (req.query.groupBy === "subject") {
    groups = serialized.reduce((acc, session) => {
      const key = session.subjectId ?? "unknown";
      if (!acc[key]) {
        acc[key] = {
          subjectId: session.subjectId,
          subjectName: session.subjectName,
          sessions: [],
        };
      }
      acc[key].sessions.push(session);
      return acc;
    }, {});
    groups = Object.values(groups);
  } else if (req.query.groupBy === "status") {
    groups = serialized.reduce((acc, session) => {
      if (!acc[session.status]) acc[session.status] = [];
      acc[session.status].push(session);
      return acc;
    }, {});
  } else if (req.query.groupBy === "date") {
    groups = serialized.reduce((acc, session) => {
      const key = (session.completedAt ?? session.startedAt ?? "").slice(0, 10) || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {});
  }

  res.json(
    buildSuccessResponse("Focus session history fetched successfully", {
      sessions: serialized,
      groups,
      pagination: result.pagination,
      resumeAvailable: serialized.some(
        (s) => s.status === "running" || s.status === "paused",
      ),
    }),
  );
});

export const historySummary = asyncHandler(async (req, res) => {
  const summary = await analyticsService.getSummary(req.user.userId, req.query);
  res.json(buildSuccessResponse("Focus history summary fetched successfully", summary));
});
