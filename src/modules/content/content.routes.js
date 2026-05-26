import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import { uploadSingleFile } from "../../middleware/upload.middleware.js";
import {
  create,
  getById,
  getDocPreview,
  getExcelPreview,
  getTextPreview,
  list,
  listBySubject,
  remove,
  update,
  uploadFile,
} from "./content.controller.js";
import {
  contentIdParamSchema,
  createContentSchema,
  listQuerySchema,
  subjectIdParamSchema,
  updateContentSchema,
  updateContentMultipartSchema,
  uploadMetadataSchema,
} from "./content.validation.js";

const validateParams = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.params);

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  next();
};

const validateQuery = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.query);

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  next();
};

const validateUpdateContent = (req, res, next) => {
  const schema = req.file ? updateContentMultipartSchema : updateContentSchema;
  const { error, value } = schema.validate(req.body, {
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  const hasFields = Object.keys(value).length > 0;
  if (!hasFields && !req.file) {
    return res.status(400).json({
      success: false,
      message: "At least one field or replacement file is required",
    });
  }

  req.body = value;
  next();
};

const router = Router();

router.use(verifyTokenMiddleware);

router.get("/", validateQuery(listQuerySchema), list);
router.get(
  "/:id/text-preview",
  validateParams(contentIdParamSchema),
  getTextPreview,
);
router.get(
  "/:id/doc-preview",
  validateParams(contentIdParamSchema),
  getDocPreview,
);
router.get(
  "/:id/excel-preview",
  validateParams(contentIdParamSchema),
  getExcelPreview,
);
router.get(
  "/subject/:subjectId",
  validateParams(subjectIdParamSchema),
  listBySubject,
);
router.post(
  "/upload",
  uploadSingleFile,
  validateBody(uploadMetadataSchema),
  uploadFile,
);
router.post("/", validateBody(createContentSchema), create);
router.get("/:id", validateParams(contentIdParamSchema), getById);
router.put(
  "/:id",
  validateParams(contentIdParamSchema),
  uploadSingleFile,
  validateUpdateContent,
  update,
);
router.delete("/:id", validateParams(contentIdParamSchema), remove);

export default router;
