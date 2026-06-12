import { asyncHandler } from "../../../utils/asyncHandler.js";

export const health = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: "AI module is ready",
  });
});
