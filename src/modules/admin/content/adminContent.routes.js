import { Router } from "express";
import {
  requireAdmin,
  validateParams,
  validateQuery,
} from "../shared/admin.middleware.js";
import {
  deleteContent,
  getContentById,
  getDocPreview,
  getExcelPreview,
  getTextPreview,
  listContent,
} from "./adminContent.controller.js";
import {
  adminContentIdParamSchema,
  adminListContentQuerySchema,
} from "./adminContent.validation.js";

const router = Router();

router.use(...requireAdmin);

router.get("/", validateQuery(adminListContentQuerySchema), listContent);
router.delete(
  "/:id",
  validateParams(adminContentIdParamSchema),
  deleteContent,
);

router.get(
  "/:id/text-preview",
  validateParams(adminContentIdParamSchema),
  getTextPreview,
);
router.get(
  "/:id/doc-preview",
  validateParams(adminContentIdParamSchema),
  getDocPreview,
);
router.get(
  "/:id/excel-preview",
  validateParams(adminContentIdParamSchema),
  getExcelPreview,
);
router.get(
  "/:id",
  validateParams(adminContentIdParamSchema),
  getContentById,
);

export default router;
