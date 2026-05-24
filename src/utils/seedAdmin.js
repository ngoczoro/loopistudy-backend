import sequelize from "../config/database.js";
import { hashPassword } from "./password.js";
import { ROLES, USER_STATUS } from "../config/constants.js";

export const seedAdmin = async () => {
  try {
    const User = sequelize.models.User;
    if (!User) return;

    const existingAdmin = await User.findOne({
      where: { email: "admin@loopi.com" },
    });

    if (!existingAdmin) {
      const passwordHash = await hashPassword("admin123");
      await User.create({
        email: "admin@loopi.com",
        passwordHash,
        fullName: "System Admin",
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      });
      console.log(
        "✅ Default admin automatically seeded: admin@loopi.com / admin123",
      );
      return;
    }

    const updates = {};
    if (existingAdmin.role !== ROLES.ADMIN) {
      updates.role = ROLES.ADMIN;
    }
    if (existingAdmin.status !== USER_STATUS.ACTIVE) {
      updates.status = USER_STATUS.ACTIVE;
    }

    if (Object.keys(updates).length > 0) {
      await existingAdmin.update(updates);
      console.log("✅ Default admin account normalized to admin/ACTIVE");
    }
  } catch (error) {
    console.error("❌ Failed to auto-seed admin user:", error.message);
  }
};
