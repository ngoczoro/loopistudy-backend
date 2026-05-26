import "../config/loadEnv.js";
import sequelize from "../config/database.js";
import { initializeModels } from "../models/index.js";
import { up as normalizeAuthEnums } from "./003_normalize_auth_enums.js";
import { up as frontendAlignedSchema } from "./004_frontend_aligned_schema.js";
import { up as contentItemsCloudinaryFields } from "./005_content_items_cloudinary_fields.js";
import { up as focusSessionNotes } from "./005_add_focus_session_notes.js";
import { up as focusSessionRecovery } from "./006_focus_session_recovery.js";
import { up as removeGoogleDriveFileId } from "./007_remove_google_drive_file_id.js";
import { up as focusAnalyticsIndexes } from "./007_focus_analytics_indexes.js";
import { up as cleanupGoogleDriveColumn } from "./008_cleanup_google_drive_column.js";
import { up as focusUnfinishedWorkspaceIndexes } from "./008_focus_unfinished_workspace_indexes.js";
import { up as tasksPhase3Fields } from "./009_tasks_phase3_fields.js";
import { up as focusSessionsOptionalSubject } from "./010_focus_sessions_optional_subject.js";
import { up as schemaConsistencyFocusSessions } from "./011_schema_consistency_focus_sessions.js";

const migrations = [
  { name: "003_normalize_auth_enums", up: normalizeAuthEnums },
  { name: "004_frontend_aligned_schema", up: frontendAlignedSchema },
  { name: "005_content_items_cloudinary_fields", up: contentItemsCloudinaryFields },
  { name: "005_add_focus_session_notes", up: focusSessionNotes },
  { name: "006_focus_session_recovery", up: focusSessionRecovery },
  { name: "007_remove_google_drive_file_id", up: removeGoogleDriveFileId },
  { name: "007_focus_analytics_indexes", up: focusAnalyticsIndexes },
  { name: "008_cleanup_google_drive_column", up: cleanupGoogleDriveColumn },
  { name: "008_focus_unfinished_workspace_indexes", up: focusUnfinishedWorkspaceIndexes },
  { name: "009_tasks_phase3_fields", up: tasksPhase3Fields },
  { name: "010_focus_sessions_optional_subject", up: focusSessionsOptionalSubject },
  { name: "011_schema_consistency_focus_sessions", up: schemaConsistencyFocusSessions },
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
