import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import {
  changePassword,
  getBlockedSlots,
  getMe,
  getPreferences,
  replaceBlockedSlots,
  updateMe,
  updatePreferences,
} from "./user.controller.js";
import {
  changePasswordSchema,
  replaceBlockedSlotsSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "./user.validation.js";

const router = Router();

router.use(verifyTokenMiddleware);

// Register nested /me/* routes before /me to avoid future path collisions
router.get("/me/preferences", getPreferences);
router.patch(
  "/me/preferences",
  validateBody(updatePreferencesSchema),
  updatePreferences,
);

router.get("/me/blocked-slots", getBlockedSlots);
router.put(
  "/me/blocked-slots",
  validateBody(replaceBlockedSlotsSchema),
  replaceBlockedSlots,
);

router.post(
  "/me/password",
  validateBody(changePasswordSchema),
  changePassword,
);

router.get("/me", getMe);
router.patch("/me", validateBody(updateProfileSchema), updateMe);

export default router;
