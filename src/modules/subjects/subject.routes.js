import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import {
  create,
  getById,
  list,
  remove,
  update,
} from "./subject.controller.js";
import {
  createSubjectSchema,
  subjectIdParamSchema,
  updateSubjectSchema,
} from "./subject.validation.js";

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

const router = Router();

router.use(verifyTokenMiddleware);

router.get("/", list);
router.post("/", validateBody(createSubjectSchema), create);
router.get("/:id", validateParams(subjectIdParamSchema), getById);
router.put(
  "/:id",
  validateParams(subjectIdParamSchema),
  validateBody(updateSubjectSchema),
  update,
);
router.delete("/:id", validateParams(subjectIdParamSchema), remove);

export default router;
