import { Router } from "express";
import { validateBody } from "../../../validations/schemas.js";
import {
  requireAdmin,
  validateParams,
  validateQuery,
} from "../shared/admin.middleware.js";
import {
  getUserById,
  listUsers,
  lockUser,
  unlockUser,
} from "./userManagement.controller.js";
import {
  adminListUsersQuerySchema,
  adminUserIdParamSchema,
  lockUserSchema,
} from "./userManagement.validator.js";

const router = Router();

router.use(...requireAdmin);

router.get("/", validateQuery(adminListUsersQuerySchema), listUsers);
router.get("/:id", validateParams(adminUserIdParamSchema), getUserById);
router.patch(
  "/:id/lock",
  validateParams(adminUserIdParamSchema),
  validateBody(lockUserSchema),
  lockUser,
);
router.patch(
  "/:id/unlock",
  validateParams(adminUserIdParamSchema),
  unlockUser,
);

export default router;
