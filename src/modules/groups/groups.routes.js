import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import {
  uploadFiles,
  uploadSingleImage,
} from "../../middleware/upload.middleware.js";
import { validateBody, validateQuery } from "../../validations/schemas.js";
import {
  clearHistory,
  create,
  createGoal,
  createResource,
  createTask,
  deleteGoal,
  deleteResource,
  deleteTask,
  getProgress,
  listGoals,
  listResources,
  listTasks,
  remindTask,
  updateGoal,
  updateTask,
  getById,
  join,
  leave,
  list,
  listMembers,
  listMessages,
  listShared,
  markRead,
  regenerateInviteCode,
  remove,
  removeMember,
  sendMessage,
  update,
  updateMySettings,
} from "./groups.controller.js";
import {
  CHAT_FILES_FIELD,
  CHAT_MAX_FILES,
  GROUP_AVATAR_FIELD,
} from "./groups.constants.js";
import {
  createGoalSchema,
  createGroupSchema,
  createResourceSchema,
  createTaskSchema,
  goalParamSchema,
  groupIdParamSchema,
  listTasksQuerySchema,
  taskParamSchema,
  updateGoalSchema,
  updateTaskSchema,
  resourceParamSchema,
  joinGroupSchema,
  listMessagesQuerySchema,
  listSharedQuerySchema,
  memberParamSchema,
  sendMessageSchema,
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

router.get("/:groupId/resources", validateParams(groupIdParamSchema), listResources);
router.post(
  "/:groupId/resources",
  validateParams(groupIdParamSchema),
  validateBody(createResourceSchema),
  createResource,
);
router.delete(
  "/:groupId/resources/:resourceId",
  validateParams(resourceParamSchema),
  deleteResource,
);

router.get("/:groupId/goals", validateParams(groupIdParamSchema), listGoals);
router.post(
  "/:groupId/goals",
  validateParams(groupIdParamSchema),
  validateBody(createGoalSchema),
  createGoal,
);
router.patch(
  "/:groupId/goals/:goalId",
  validateParams(goalParamSchema),
  validateBody(updateGoalSchema),
  updateGoal,
);
router.delete("/:groupId/goals/:goalId", validateParams(goalParamSchema), deleteGoal);

router.get(
  "/:groupId/tasks",
  validateParams(groupIdParamSchema),
  validateQuery(listTasksQuerySchema),
  listTasks,
);
router.post(
  "/:groupId/tasks",
  validateParams(groupIdParamSchema),
  validateBody(createTaskSchema),
  createTask,
);
router.patch(
  "/:groupId/tasks/:taskId",
  validateParams(taskParamSchema),
  validateBody(updateTaskSchema),
  updateTask,
);
router.delete("/:groupId/tasks/:taskId", validateParams(taskParamSchema), deleteTask);
router.post("/:groupId/tasks/:taskId/remind", validateParams(taskParamSchema), remindTask);

router.get("/:groupId/progress", validateParams(groupIdParamSchema), getProgress);

router.get(
  "/:groupId/messages",
  validateParams(groupIdParamSchema),
  validateQuery(listMessagesQuerySchema),
  listMessages,
);
router.post(
  "/:groupId/messages",
  validateParams(groupIdParamSchema),
  uploadFiles(CHAT_FILES_FIELD, CHAT_MAX_FILES),
  validateBody(sendMessageSchema),
  sendMessage,
);
router.post(
  "/:groupId/messages/clear",
  validateParams(groupIdParamSchema),
  clearHistory,
);
router.post("/:groupId/read", validateParams(groupIdParamSchema), markRead);
router.get(
  "/:groupId/shared",
  validateParams(groupIdParamSchema),
  validateQuery(listSharedQuerySchema),
  listShared,
);

export default router;
