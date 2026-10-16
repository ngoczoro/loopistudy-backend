import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { uploadSingleImage } from "../../middleware/upload.middleware.js";
import { validateBody } from "../../validations/schemas.js";
import {
  create,
  getById,
  join,
  leave,
  list,
  listMembers,
  regenerateInviteCode,
  remove,
  removeMember,
  update,
  updateMySettings,
} from "./groups.controller.js";
import { GROUP_AVATAR_FIELD } from "./groups.constants.js";
import {
  createGroupSchema,
  groupIdParamSchema,
  joinGroupSchema,
  memberParamSchema,
  updateGroupSchema,
  updateMySettingsSchema,
} from "./groups.validation.js";

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

const withBody = (req, _res, next) => {
  req.body ??= {};
  next();
};

const router = Router();

router.use(verifyTokenMiddleware);
router.use(withBody);

router.get("/", list);
router.post("/", validateBody(createGroupSchema), create);
router.post("/join", validateBody(joinGroupSchema), join);

router.get("/:groupId", validateParams(groupIdParamSchema), getById);
router.patch(
  "/:groupId",
  validateParams(groupIdParamSchema),
  uploadSingleImage(GROUP_AVATAR_FIELD),
  validateBody(updateGroupSchema),
  update,
);
router.delete("/:groupId", validateParams(groupIdParamSchema), remove);

router.post("/:groupId/leave", validateParams(groupIdParamSchema), leave);
router.post(
  "/:groupId/invite-code",
  validateParams(groupIdParamSchema),
  regenerateInviteCode,
);
router.patch(
  "/:groupId/me",
  validateParams(groupIdParamSchema),
  validateBody(updateMySettingsSchema),
  updateMySettings,
);

router.get("/:groupId/members", validateParams(groupIdParamSchema), listMembers);
router.delete(
  "/:groupId/members/:userId",
  validateParams(memberParamSchema),
  removeMember,
);

export default router;
