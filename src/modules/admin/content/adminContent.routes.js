import { Router } from "express";
import { requireAdmin, validateParams } from "../shared/admin.middleware.js";
import {
  getContentById,
  getDocPreview,
  getExcelPreview,
  getTextPreview,
} from "./adminContent.controller.js";
import { adminContentIdParamSchema } from "./adminContent.validation.js";

const router = Router();

router.use(...requireAdmin);

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
