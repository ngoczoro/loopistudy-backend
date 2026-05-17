import { Router } from "express";
import * as noteController from "../controllers/noteController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", noteController.create);
router.get("/", noteController.getAll);
router.get("/:id", noteController.getById);
router.put("/:id", noteController.update);
router.delete("/:id", noteController.remove);

export default router;
