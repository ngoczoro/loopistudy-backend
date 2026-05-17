import { Router } from "express";
import * as taskController from "../controllers/taskController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", taskController.create);
router.get("/", taskController.getAll);
router.get("/:id", taskController.getById);
router.put("/:id", taskController.update);
router.delete("/:id", taskController.remove);

export default router;
