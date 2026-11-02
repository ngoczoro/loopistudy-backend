import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  listSources,
  sendMessage,
  updateConversation,
} from "./assistant.controller.js";
import {
  conversationIdParamSchema,
  createConversationSchema,
  sendMessageSchema,
  updateConversationSchema,
} from "./assistant.validation.js";

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

router.get("/sources", listSources);

router.get("/conversations", listConversations);
router.post("/conversations", validateBody(createConversationSchema), createConversation);
router.patch(
  "/conversations/:conversationId",
  validateParams(conversationIdParamSchema),
  validateBody(updateConversationSchema),
  updateConversation,
);
router.delete(
  "/conversations/:conversationId",
  validateParams(conversationIdParamSchema),
  deleteConversation,
);
router.get(
  "/conversations/:conversationId/messages",
  validateParams(conversationIdParamSchema),
  listMessages,
);
router.post(
  "/conversations/:conversationId/messages",
  validateParams(conversationIdParamSchema),
  validateBody(sendMessageSchema),
  sendMessage,
);

export default router;
