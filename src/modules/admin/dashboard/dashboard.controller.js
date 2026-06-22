import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as dashboardService from "./dashboard.service.js";

export const getStats = asyncHandler(async (_req, res) => {
  const data = await dashboardService.getDashboardStats();
  res.json({
    success: true,
    data,
  });
});

export const getRecentContent = asyncHandler(async (req, res) => {
  const limit = req.validatedQuery?.limit ?? 10;
  const data = await dashboardService.getRecentContent(limit);
  res.json({
    success: true,
    data,
  });
});

export const getWeeklyActivity = asyncHandler(async (_req, res) => {
  const data = await dashboardService.getWeeklyActivity();
  res.json({
    success: true,
    data,
  });
});
