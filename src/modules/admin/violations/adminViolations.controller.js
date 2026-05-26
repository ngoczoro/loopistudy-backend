import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getPaginationParams } from "../../../utils/response.js";
import * as adminViolationsService from "./adminViolations.service.js";

export const getStats = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const data = await adminViolationsService.getStats(query);

  res.json({
    success: true,
    data,
  });
});

export const listViolations = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const { page, limit, offset } = getPaginationParams(query);
  const { flaggedUsers, total } = await adminViolationsService.listGroupedByUser(
    query,
    { limit, offset },
  );

  res.json({
    success: true,
    data: {
      flaggedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

export const resolveViolation = asyncHandler(async (req, res) => {
  const data = await adminViolationsService.resolveViolation(
    req.params.id,
    req.user.userId,
  );

  res.json({
    success: true,
    message: "Violation resolved successfully",
    data,
  });
});
