import { Router } from "express";
import authRoutes from "./authRoutes.js";
import passwordRoutes from "./passwordRoutes.js";
import subjectRoutes from "./subjectRoutes.js";
import pomodoroRoutes from "./pomodoroRoutes.js";

const router = Router();

/**
 * API v1 Routes
 */
router.use("/auth", authRoutes);
router.use("/password", passwordRoutes);
router.use("/subjects", subjectRoutes);
router.use("/pomodoro", pomodoroRoutes);

// Add more routes here as they are created
// router.use('/study-plans', studyPlanRoutes);
// router.use('/quizzes', quizRoutes);
// router.use('/progress', progressRoutes);
// router.use('/goals', goalRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/admin', adminRoutes);

export default router;
