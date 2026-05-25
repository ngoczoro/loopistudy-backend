import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../validations/schemas.js";
import { create, getById, list, remove, update } from "./planner.controller.js";
import {
  createPlannerSessionSchema,
  listPlannerSessionsQuerySchema,
  plannerSessionIdParamSchema,
  updatePlannerSessionSchema,
} from "./planner.validation.js";

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

router.get("/", validateQuery(listPlannerSessionsQuerySchema), list);
router.post("/", validateBody(createPlannerSessionSchema), create);
router.get("/:id", validateParams(plannerSessionIdParamSchema), getById);
router.patch(
  "/:id",
  validateParams(plannerSessionIdParamSchema),
  validateBody(updatePlannerSessionSchema),
  update,
);
router.delete("/:id", validateParams(plannerSessionIdParamSchema), remove);

export default router;
