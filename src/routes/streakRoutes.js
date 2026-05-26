import { Router } from "express";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

/**
 * Legacy CRUD /streaks (sequelize.models.Streak) was removed in migration 004.
 * Focus study streaks live at GET /focus-sessions/analytics/streak (user_streaks cache).
 */
const DEPRECATED_MESSAGE =
  "The /streaks API is deprecated. Use GET /api/v1/focus-sessions/analytics/streak for study streak data.";

const router = Router();

router.use(verifyTokenMiddleware);
router.all(/.*/, (_req, res) => {
  res.status(410).json({
    success: false,
    message: DEPRECATED_MESSAGE,
  });
});

export default router;
