import { Router } from "express";
import * as documentController from "../controllers/documentController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", documentController.create);
router.get("/", documentController.getAll);
router.get("/:id", documentController.getById);
router.put("/:id", documentController.update);
router.delete("/:id", documentController.remove);

export default router;
