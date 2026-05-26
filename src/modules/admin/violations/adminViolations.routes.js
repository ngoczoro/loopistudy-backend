import { Router } from "express";
import {
  requireAdmin,
  validateParams,
  validateQuery,
} from "../shared/admin.middleware.js";
import {
  getStats,
  listViolations,
  resolveViolation,
} from "./adminViolations.controller.js";
import {
  adminListViolationsQuerySchema,
  adminViolationIdParamSchema,
  adminViolationStatsQuerySchema,
} from "./adminViolations.validation.js";

const router = Router();

router.use(...requireAdmin);

router.get(
  "/stats",
  validateQuery(adminViolationStatsQuerySchema),
  getStats,
);
router.get("/", validateQuery(adminListViolationsQuerySchema), listViolations);
router.patch(
  "/:id/resolve",
  validateParams(adminViolationIdParamSchema),
  resolveViolation,
);

export default router;
