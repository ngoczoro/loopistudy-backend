import { Router } from "express";
import { authRoutes, passwordRoutes } from "../modules/auth/index.js";
import { subjectRoutes } from "../modules/subjects/index.js";
import { userRoutes } from "../modules/users/index.js";
import { plannerSessionRoutes } from "../modules/planner/index.js";
import documentRoutes from "./documentRoutes.js";
import noteRoutes from "./noteRoutes.js";
import quizRoutes from "./quizRoutes.js";
import taskRoutes from "./taskRoutes.js";
import studyPlanRoutes from "./studyPlanRoutes.js";
import studySessionRoutes from "./studySessionRoutes.js";
import pomodoroRoutes from "./pomodoroRoutes.js";
import goalRoutes from "./goalRoutes.js";
import streakRoutes from "./streakRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import aiRequestRoutes from "./aiRequestRoutes.js";
import violationRoutes from "./violationRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/password", passwordRoutes);
router.use("/users", userRoutes);
router.use("/subjects", subjectRoutes);
router.use("/planner/sessions", plannerSessionRoutes);
router.use("/documents", documentRoutes);
router.use("/notes", noteRoutes);
router.use("/quizzes", quizRoutes);
router.use("/tasks", taskRoutes);
router.use("/study-plans", studyPlanRoutes);
router.use("/study-sessions", studySessionRoutes);
router.use("/pomodoro", pomodoroRoutes);
router.use("/goals", goalRoutes);
router.use("/streaks", streakRoutes);
router.use("/notifications", notificationRoutes);
router.use("/ai-requests", aiRequestRoutes);
router.use("/violations", violationRoutes);

export default router;
