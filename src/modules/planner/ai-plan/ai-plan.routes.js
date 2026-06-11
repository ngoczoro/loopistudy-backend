import { Router } from "express";
import { verifyTokenMiddleware } from "../../../middlewares/authMiddleware.js";
import { validateBody } from "../../../validations/schemas.js";
import {
  analyzeDocument,
  apply,
  chat,
  generate,
} from "./ai-plan.controller.js";
import {
  analyzeDocumentSchema,
  applyAiPlanSchema,
  chatAiPlanSchema,
  generateAiPlanSchema,
} from "./ai-plan.validation.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/generate", validateBody(generateAiPlanSchema), generate);
router.post("/apply", validateBody(applyAiPlanSchema), apply);
router.post("/chat", validateBody(chatAiPlanSchema), chat);
router.post("/analyze-document", validateBody(analyzeDocumentSchema), analyzeDocument);

export default router;
