import { Router } from "express";
import * as studyPlanController from "../controllers/studyPlanController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", studyPlanController.create);
router.get("/", studyPlanController.getAll);
router.get("/:id", studyPlanController.getById);
router.put("/:id", studyPlanController.update);
router.delete("/:id", studyPlanController.remove);

export default router;
