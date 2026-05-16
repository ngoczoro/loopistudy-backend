import { Router } from "express";
import authRoutes from "./authRoutes.js";
import passwordRoutes from "./passwordRoutes.js";
import subjectRoutes from "./subjectRoutes.js";
import pomodoroRoutes from "./pomodoroRoutes.js";
import noteRoutes from "./noteRoutes.js";
import quizRoutes from "./quizRoutes.js";
import goalRoutes from "./goalRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
const router = Router();

/**
 * API v1 Routes
 */
router.use("/auth", authRoutes);
router.use("/password", passwordRoutes);
router.use("/subjects", subjectRoutes);
router.use("/pomodoro", pomodoroRoutes);

router.use("/notes", noteRoutes);
router.use("/quizzes", quizRoutes);
router.use("/goals", goalRoutes);
router.use("/notifications", notificationRoutes);

// Add more routes here as they are created
// router.use('/study-plans', studyPlanRoutes);
// router.use('/progress', progressRoutes);
// router.use('/admin', adminRoutes);

export default router;
