import { Router } from "express";
import * as pomodoroController from "../controllers/pomodoroController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", pomodoroController.create);
router.get("/", pomodoroController.getAll);
router.get("/:id", pomodoroController.getById);
router.put("/:id", pomodoroController.update);
router.delete("/:id", pomodoroController.remove);

export default router;
