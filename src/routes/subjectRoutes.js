import { Router } from "express";
import * as subjectController from "../controllers/subjectController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/", subjectController.create);
router.get("/", subjectController.getAll);
router.get("/:id", subjectController.getById);
router.put("/:id", subjectController.update);
router.delete("/:id", subjectController.remove);

export default router;
