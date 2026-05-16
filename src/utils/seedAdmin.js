import sequelize from "../config/database.js";
import { hashPassword } from "./password.js";

export const seedAdmin = async () => {
  try {
    // We must wait for models to be initialized before accessing them
    const User = sequelize.models.User;
    if (!User) return;

    // Check if specifically our default one exists
    const existingAdmin = await User.findOne({ where: { email: "admin@loopi.com" } });
    if (!existingAdmin) {
      const passwordHash = await hashPassword("admin123");
      await User.create({
        email: "admin@loopi.com",
        passwordHash,
        fullName: "System Admin",
        role: "admin",
        status: "active",
      });
      console.log("✅ Default admin automatically seeded: admin@loopi.com / admin123");
    }
  } catch (error) {
    console.error("❌ Failed to auto-seed admin user:", error.message);
  }
};
