import { Router } from "express";
import { requireAdmin } from "../shared/admin.middleware.js";
import { getOverview } from "./dashboard.controller.js";

const router = Router();

router.use(...requireAdmin);

/** Future: widgets, stats, trends. */
router.get("/", getOverview);

export default router;
