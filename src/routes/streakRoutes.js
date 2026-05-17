import { Router } from "express";
import * as streakController from "../controllers/streakController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", streakController.create);
router.get("/", streakController.getAll);
router.get("/:id", streakController.getById);
router.put("/:id", streakController.update);
router.delete("/:id", streakController.remove);

export default router;
