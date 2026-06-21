import { Router } from "express";
import { requireAdmin, validateQuery } from "../shared/admin.middleware.js";
import { searchAdmin } from "./adminSearch.controller.js";
import { adminSearchQuerySchema } from "./adminSearch.validation.js";

const router = Router();

router.use(...requireAdmin);

router.get("/", validateQuery(adminSearchQuerySchema), searchAdmin);

export default router;
