import { Router } from "express";
import {
  requireAdmin,
  validateParams,
  validateQuery,
} from "../shared/admin.middleware.js";
import { deleteSubject, listSubjects } from "./adminSubjects.controller.js";
import {
  adminListSubjectsQuerySchema,
  adminSubjectIdParamSchema,
} from "./adminSubjects.validation.js";

const router = Router();

router.use(...requireAdmin);

router.get("/", validateQuery(adminListSubjectsQuerySchema), listSubjects);
router.delete(
  "/:id",
  validateParams(adminSubjectIdParamSchema),
  deleteSubject,
);

export default router;
