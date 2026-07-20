import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", notificationController.create);
router.get("/", notificationController.getAll);
router.patch("/:id/read", notificationController.markAsRead);
router.get("/:id", notificationController.getById);
router.put("/:id", notificationController.update);
router.delete("/", notificationController.removeAll);
router.delete("/:id", notificationController.remove);

export default router;
