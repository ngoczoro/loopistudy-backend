import { Router } from "express";
import {
  startPomodoroSession,
  pausePomodoroSession,
  resumePomodoroSession,
  completePomodoroSession,
  getPomodoroStats,
} from "../controllers/pomodoroController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// All routes require authentication
router.use(verifyTokenMiddleware);

/**
 * Pomodoro session management routes
 */
router.post("/start", startPomodoroSession);
router.post("/:id/pause", pausePomodoroSession);
router.post("/:id/resume", resumePomodoroSession);
router.post("/:id/complete", completePomodoroSession);
router.get("/stats", getPomodoroStats);

export default router;
