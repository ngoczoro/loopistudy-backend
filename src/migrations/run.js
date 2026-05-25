import "../config/loadEnv.js";
import sequelize from "../config/database.js";
import { initializeModels } from "../models/index.js";
import { up as normalizeAuthEnums } from "./003_normalize_auth_enums.js";
import { up as frontendAlignedSchema } from "./004_frontend_aligned_schema.js";
import { up as contentItemsCloudinaryFields } from "./005_content_items_cloudinary_fields.js";
import { up as removeGoogleDriveFileId } from "./007_remove_google_drive_file_id.js";
import { up as cleanupGoogleDriveColumn } from "./008_cleanup_google_drive_column.js";
import { up as tasksPhase3Fields } from "./009_tasks_phase3_fields.js";

const migrations = [
  { name: "003_normalize_auth_enums", up: normalizeAuthEnums },
  { name: "004_frontend_aligned_schema", up: frontendAlignedSchema },
  { name: "005_content_items_cloudinary_fields", up: contentItemsCloudinaryFields },
  { name: "007_remove_google_drive_file_id", up: removeGoogleDriveFileId },
  { name: "008_cleanup_google_drive_column", up: cleanupGoogleDriveColumn },
  { name: "009_tasks_phase3_fields", up: tasksPhase3Fields },
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
