import { Router } from "express";
import * as quizController from "../controllers/quizController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", quizController.create);
router.get("/", quizController.getAll);
router.get("/:id", quizController.getById);
router.put("/:id", quizController.update);
router.delete("/:id", quizController.remove);

export default router;
