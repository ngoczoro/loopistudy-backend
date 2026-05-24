import dotenv from "dotenv";
import sequelize from "../config/database.js";
import { initializeModels } from "../models/index.js";
import { up as normalizeAuthEnums } from "./003_normalize_auth_enums.js";
import { up as frontendAlignedSchema } from "./004_frontend_aligned_schema.js";

dotenv.config();

const migrations = [
  { name: "003_normalize_auth_enums", up: normalizeAuthEnums },
  { name: "004_frontend_aligned_schema", up: frontendAlignedSchema },
];

const runMigrations = async () => {
  try {
    await sequelize.authenticate();
    console.log("✓ Database connection successful");

    initializeModels();

    for (const migration of migrations) {
      console.log(`→ Running migration: ${migration.name}`);
      await migration.up(sequelize);
    }

    console.log("✓ All migrations completed");
    process.exit(0);
  } catch (error) {
    console.error("✗ Migration runner failed:", error.message);
    process.exit(1);
  }
};

runMigrations();
