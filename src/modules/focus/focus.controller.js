import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as focusService from "./focus.service.js";
import * as analyticsService from "./focus.analytics.service.js";
import { serializeFocusSessionList } from "./focus.serializer.js";

export const create = asyncHandler(async (req, res) => {
  const data = await focusService.createSession(req.user.userId, req.body);
  res
    .status(201)
    .json(buildSuccessResponse("Focus session started successfully", data));
});

export const active = asyncHandler(async (req, res) => {
  const data = await focusService.getActiveSession(req.user.userId);
  res.json(
    buildSuccessResponse(
      data
        ? "Active focus session fetched successfully"
        : "No active focus session",
      data,
    ),
  );
});

export const unfinished = asyncHandler(async (req, res) => {
  const data = await focusService.listUnfinishedWorkspaces(req.user.userId);
  res.json(
    buildSuccessResponse("Unfinished workspaces fetched successfully", data),
  );
});

export const discard = asyncHandler(async (req, res) => {
  await focusService.discardUnfinishedWorkspace(req.user.userId, req.params.id);
  res.json(
    buildSuccessResponse("Unfinished workspace discarded successfully", null),
  );
});

export const pause = asyncHandler(async (req, res) => {
  const data = await focusService.pauseSession(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Focus session paused successfully", data));
});

export const resume = asyncHandler(async (req, res) => {
  const data = await focusService.resumeSession(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Focus session resumed successfully", data));
});

export const sync = asyncHandler(async (req, res) => {
  const data = await focusService.syncSession(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Focus session synced successfully", data));
});

export const complete = asyncHandler(async (req, res) => {
  const data = await focusService.completeSession(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Focus session completed successfully", data));
});

export const abandon = asyncHandler(async (req, res) => {
  const data = await focusService.abandonSession(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Focus session ended successfully", data));
});

export const history = asyncHandler(async (req, res) => {
  const hasFilters =
    req.query.status ||
    req.query.subjectId ||
    req.query.fromDate ||
    req.query.toDate ||
    req.query.limit ||
    req.query.offset ||
    req.query.groupBy;

  if (hasFilters) {
    const result = await analyticsService.getFilteredHistory(
      req.user.userId,
      req.query,
    );
    const serialized = serializeFocusSessionList(result.sessions);

    let groups = null;
    if (req.query.groupBy === "subject") {
      const map = {};
      for (const session of serialized) {
        const key = session.subjectId ?? "unknown";
        if (!map[key]) {
          map[key] = {
            subjectId: session.subjectId,
            subjectName: session.subjectName,
            sessions: [],
          };
        }
        map[key].sessions.push(session);
      }
      groups = Object.values(map);
    } else if (req.query.groupBy === "status") {
      groups = {};
      for (const session of serialized) {
        if (!groups[session.status]) groups[session.status] = [];
        groups[session.status].push(session);
      }
    } else if (req.query.groupBy === "date") {
      groups = {};
      for (const session of serialized) {
        const key =
          (session.completedAt ?? session.startedAt ?? "").slice(0, 10) ||
          "unknown";
        if (!groups[key]) groups[key] = [];
        groups[key].push(session);
      }
    }

    return res.json(
      buildSuccessResponse("Focus session history fetched successfully", {
        sessions: serialized,
        groups,
        pagination: result.pagination,
        resumeAvailable: serialized.some(
          (s) => s.status === "running" || s.status === "paused",
        ),
      }),
    );
  }

  const data = await focusService.getHistory(req.user.userId);
  res.json(buildSuccessResponse("Focus session history fetched successfully", data));
});
