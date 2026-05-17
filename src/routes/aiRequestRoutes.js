import { Router } from "express";
import * as aiRequestController from "../controllers/aiRequestController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", aiRequestController.create);
router.get("/", aiRequestController.getAll);
router.get("/:id", aiRequestController.getById);
router.put("/:id", aiRequestController.update);
router.delete("/:id", aiRequestController.remove);

export default router;
