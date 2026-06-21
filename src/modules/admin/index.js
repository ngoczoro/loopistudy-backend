import { Router } from "express";
import dashboardRoutes from "./dashboard/dashboard.routes.js";
import adminContentRoutes from "./content/adminContent.routes.js";
import adminSubjectsRoutes from "./subjects/adminSubjects.routes.js";
import adminViolationsRoutes from "./violations/adminViolations.routes.js";
import userManagementRoutes from "./user-management/userManagement.routes.js";
import adminSearchRoutes from "./search/adminSearch.routes.js";

const router = Router();

router.use("/dashboard", dashboardRoutes);
router.use("/content", adminContentRoutes);
router.use("/subjects", adminSubjectsRoutes);
router.use("/violations", adminViolationsRoutes);
router.use("/users", userManagementRoutes);
router.use("/search", adminSearchRoutes);

export default router;
export { router as adminRoutes };

export * as userManagementService from "./user-management/userManagement.service.js";
export {
  serializeAdminUser,
  serializeAdminUserDetail,
  serializeAdminUserList,
} from "./user-management/userManagement.serializer.js";
