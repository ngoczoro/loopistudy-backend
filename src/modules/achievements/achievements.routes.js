import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { listBadges } from "./achievements.controller.js";

const router = Router();

router.use(verifyTokenMiddleware);
router.get("/badges", listBadges);

export default router;
