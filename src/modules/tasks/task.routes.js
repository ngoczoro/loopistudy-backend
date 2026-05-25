import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import {
  complete,
  create,
  getById,
  getSummary,
  list,
  remove,
  update,
} from "./task.controller.js";
import {
  completeTaskSchema,
  createTaskSchema,
  listQuerySchema,
  summaryQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from "./task.validation.js";

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
  const { error, value } = schema.validate(req.query, {
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }

  req.validatedQuery = value;
  next();
};

const router = Router();

router.use(verifyTokenMiddleware);

router.get("/summary", validateQuery(summaryQuerySchema), getSummary);
router.get("/", validateQuery(listQuerySchema), list);
router.post("/", validateBody(createTaskSchema), create);
router.get("/:id", validateParams(taskIdParamSchema), getById);
router.patch(
  "/:id/complete",
  validateParams(taskIdParamSchema),
  validateBody(completeTaskSchema),
  complete,
);
router.patch(
  "/:id",
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  update,
);
router.put(
  "/:id",
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  update,
);
router.delete("/:id", validateParams(taskIdParamSchema), remove);

export default router;
