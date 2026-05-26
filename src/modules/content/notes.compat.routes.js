import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import { CONTENT_TYPE } from "../../config/constants.js";
import * as contentService from "./content.service.js";
import {
  legacyNoteCreateSchema,
  legacyNoteUpdateSchema,
  contentIdParamSchema,
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

const toLegacyNote = (item) => ({
  id: item.id,
  title: item.title,
  content: item.content ?? "",
  description: item.description ?? null,
  subjectId: item.subjectId ?? null,
  isPinned: item.isPinned ?? false,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const router = Router();

router.use(verifyTokenMiddleware);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    console.log("[notes-compat] GET /notes");
    const data = await contentService.list(req.user.userId, {
      type: CONTENT_TYPE.NOTE,
    });
    res.json(
      buildSuccessResponse(
        "Notes fetched successfully",
        data.map(toLegacyNote),
      ),
    );
  }),
);

router.post(
  "/",
  validateBody(legacyNoteCreateSchema),
  asyncHandler(async (req, res) => {
    console.log("[notes-compat] POST /notes");
    const data = await contentService.create(req.user.userId, {
      type: CONTENT_TYPE.NOTE,
      ...req.body,
    });
    res
      .status(201)
      .json(buildSuccessResponse("Note created successfully", toLegacyNote(data)));
  }),
);

router.get(
  "/:id",
  validateParams(contentIdParamSchema),
  asyncHandler(async (req, res) => {
    const data = await contentService.getById(req.user.userId, req.params.id);
    res.json(
      buildSuccessResponse("Note fetched successfully", toLegacyNote(data)),
    );
  }),
);

router.put(
  "/:id",
  validateParams(contentIdParamSchema),
  validateBody(legacyNoteUpdateSchema),
  asyncHandler(async (req, res) => {
    const data = await contentService.update(
      req.user.userId,
      req.params.id,
      req.body,
    );
    res.json(
      buildSuccessResponse("Note updated successfully", toLegacyNote(data)),
    );
  }),
);

router.delete(
  "/:id",
  validateParams(contentIdParamSchema),
  asyncHandler(async (req, res) => {
    await contentService.remove(req.user.userId, req.params.id);
    res.json(buildSuccessResponse("Note deleted successfully"));
  }),
);

export default router;
