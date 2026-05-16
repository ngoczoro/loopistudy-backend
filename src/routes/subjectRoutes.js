import { Router } from "express";
import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  getSubjectStats,
} from "../controllers/subjectController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";
import { validateBody } from "../validations/schemas.js";
import {
  createSubjectSchema,
  updateSubjectSchema,
} from "../validations/schemas.js";

const router = Router();

// All routes require authentication
router.use(verifyTokenMiddleware);

/**
 * Subject CRUD routes
 */
router.post("/", validateBody(createSubjectSchema), createSubject);
router.get("/", getSubjects);
router.get("/:id", getSubjectById);
router.put("/:id", validateBody(updateSubjectSchema), updateSubject);
router.delete("/:id", deleteSubject);

/**
 * Subject statistics route
 */
router.get("/:id/stats", getSubjectStats);

export default router;
