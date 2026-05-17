import { Router } from "express";
import * as studySessionController from "../controllers/studySessionController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", studySessionController.create);
router.get("/", studySessionController.getAll);
router.get("/:id", studySessionController.getById);
router.put("/:id", studySessionController.update);
router.delete("/:id", studySessionController.remove);

export default router;
