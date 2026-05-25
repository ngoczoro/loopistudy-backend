import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../validations/schemas.js";
import {
  abandon,
  active,
  complete,
  create,
  discard,
  history,
  pause,
  resume,
  sync,
  unfinished,
} from "./focus.controller.js";
import {
  analyticsPlanner,
  analyticsStreak,
  analyticsSubjects,
  analyticsSummary,
  analyticsTrends,
} from "./focus.analytics.controller.js";
import {
  abandonFocusSessionSchema,
  completeFocusSessionSchema,
  createFocusSessionSchema,
  focusSessionIdParamSchema,
  pauseFocusSessionSchema,
  syncFocusSessionSchema,
} from "./focus.validation.js";
import {
  analyticsDateRangeQuerySchema,
  analyticsPlannerQuerySchema,
  analyticsTrendsQuerySchema,
  focusHistoryQuerySchema,
} from "./focus.analytics.validation.js";

const validateParams = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.params);

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  next();
};

const router = Router();

router.use(verifyTokenMiddleware);

router.get("/active", active);
router.get("/unfinished", unfinished);
router.get(
  "/history",
  validateQuery(focusHistoryQuerySchema),
  history,
);
router.get(
  "/analytics/summary",
  validateQuery(analyticsDateRangeQuerySchema),
  analyticsSummary,
);
router.get(
  "/analytics/trends",
  validateQuery(analyticsTrendsQuerySchema),
  analyticsTrends,
);
router.get(
  "/analytics/subjects",
  validateQuery(analyticsDateRangeQuerySchema),
  analyticsSubjects,
);
router.get("/analytics/streak", analyticsStreak);
router.get(
  "/analytics/planner",
  validateQuery(analyticsPlannerQuerySchema),
  analyticsPlanner,
);
router.post("/", validateBody(createFocusSessionSchema), create);
router.delete(
  "/:id",
  validateParams(focusSessionIdParamSchema),
  discard,
);
router.post(
  "/:id/pause",
  validateParams(focusSessionIdParamSchema),
  validateBody(pauseFocusSessionSchema),
  pause,
);
router.post(
  "/:id/resume",
  validateParams(focusSessionIdParamSchema),
  resume,
);
router.post(
  "/:id/sync",
  validateParams(focusSessionIdParamSchema),
  validateBody(syncFocusSessionSchema),
  sync,
);
router.post(
  "/:id/complete",
  validateParams(focusSessionIdParamSchema),
  validateBody(completeFocusSessionSchema),
  complete,
);
router.post(
  "/:id/abandon",
  validateParams(focusSessionIdParamSchema),
  validateBody(abandonFocusSessionSchema),
  abandon,
);

export default router;
