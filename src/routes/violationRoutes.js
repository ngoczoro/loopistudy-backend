import { Router } from "express";
import * as violationController from "../controllers/violationController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", violationController.create);
router.get("/", violationController.getAll);
router.get("/:id", violationController.getById);
router.put("/:id", violationController.update);
router.delete("/:id", violationController.remove);

export default router;
