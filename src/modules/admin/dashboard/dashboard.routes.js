import { Router } from "express";
import { requireAdmin, validateQuery } from "../shared/admin.middleware.js";
import { getRecentContent, getStats } from "./dashboard.controller.js";
import { recentContentQuerySchema } from "./dashboard.validation.js";

const router = Router();

router.use(...requireAdmin);

router.get("/stats", getStats);
router.get(
  "/recent-content",
  validateQuery(recentContentQuerySchema),
  getRecentContent,
);

export default router;
