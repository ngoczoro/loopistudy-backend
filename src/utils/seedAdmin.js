import sequelize from "../config/database.js";
import { hashPassword } from "./password.js";
import { ROLES, USER_STATUS } from "../config/constants.js";
import { PASSWORD_MIN_LENGTH } from "../shared/utils/passwordPolicy.js";

const DEV_FALLBACK_PASSWORD = "admin123";

const resolveAdminCredentials = () => {
  const email = process.env.ADMIN_EMAIL?.trim() || "admin@loopi.com";
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (password) {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    return { email, password, isFallback: false };
  }

  if (process.env.NODE_ENV === "production") return null;
  return { email, password: DEV_FALLBACK_PASSWORD, isFallback: true };
};

export const seedAdmin = async () => {
  try {
    const User = sequelize.models.User;
    if (!User) return;

    const credentials = resolveAdminCredentials();
    if (!credentials) {
      console.warn("⚠ ADMIN_PASSWORD is not set — skipped seeding the default admin.");
      return;
    }

    const existingAdmin = await User.findOne({
      where: { email: credentials.email },
    });

    if (!existingAdmin) {
      const passwordHash = await hashPassword(credentials.password);
      await User.create({
        email: credentials.email,
        passwordHash,
        fullName: "System Admin",
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      });
      console.log(`✅ Default admin seeded: ${credentials.email}`);
      if (credentials.isFallback) {
        console.warn("⚠ Using the development default admin password. Set ADMIN_PASSWORD in .env.");
      }
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
