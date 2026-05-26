import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as dashboardService from "./dashboard.service.js";
import { serializeDashboardOverview } from "./dashboard.serializer.js";

/** Placeholder until dashboard analytics are implemented. */
export const getOverview = asyncHandler(async (_req, res) => {
  const data = await dashboardService.getDashboardOverview();
  res.json({
    success: true,
    data: serializeDashboardOverview(data),
    message: "Dashboard analytics not yet implemented",
  });
});
