import { Router } from "express";
import dashboardRoutes from "./dashboard/dashboard.routes.js";
import userManagementRoutes from "./user-management/userManagement.routes.js";

const router = Router();

router.use("/dashboard", dashboardRoutes);
router.use("/users", userManagementRoutes);

export default router;
export { router as adminRoutes };

export * as userManagementService from "./user-management/userManagement.service.js";
export {
  serializeAdminUser,
  serializeAdminUserDetail,
  serializeAdminUserList,
} from "./user-management/userManagement.serializer.js";
