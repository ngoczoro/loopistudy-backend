import { Router } from "express";
import * as goalController from "../controllers/goalController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", goalController.create);
router.get("/", goalController.getAll);
router.get("/:id", goalController.getById);
router.put("/:id", goalController.update);
router.delete("/:id", goalController.remove);

export default router;
