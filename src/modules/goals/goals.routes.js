import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../validations/schemas.js";
import {
  create,
  getById,
  list,
  remove,
  update,
} from "./goals.controller.js";
import {
  createGoalSchema,
  goalIdParamSchema,
  listGoalsQuerySchema,
  updateGoalSchema,
} from "./goals.validation.js";

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

router.get("/", validateQuery(listGoalsQuerySchema), list);
router.post("/", validateBody(createGoalSchema), create);
router.get("/:id", validateParams(goalIdParamSchema), getById);
router.patch(
  "/:id",
  validateParams(goalIdParamSchema),
  validateBody(updateGoalSchema),
  update,
);
/** Legacy clients used PUT — same handler as PATCH. */
router.put(
  "/:id",
  validateParams(goalIdParamSchema),
  validateBody(updateGoalSchema),
  update,
);
router.delete("/:id", validateParams(goalIdParamSchema), remove);

export default router;
