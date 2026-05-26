import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as achievementsService from "./achievements.service.js";

export const listBadges = asyncHandler(async (req, res) => {
  const data = await achievementsService.listBadgesForUser(req.user.userId);
  res.json(buildSuccessResponse("Badges fetched successfully", data));
});
