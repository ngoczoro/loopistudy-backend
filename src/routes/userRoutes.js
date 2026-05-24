import { Router } from "express";
import { getMe } from "../controllers/userController.js";
import { verifyTokenMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyTokenMiddleware);

router.get("/me", getMe);

export default router;
