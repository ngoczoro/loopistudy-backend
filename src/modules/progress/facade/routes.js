import { Router } from "express";
import { verifyTokenMiddleware } from "../../../middlewares/authMiddleware.js";
import { getMilestones, getStreaks, getSummary } from "./controller.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.get("/summary", getSummary);
router.get("/streaks", getStreaks);
router.get("/milestones", getMilestones);

export default router;
