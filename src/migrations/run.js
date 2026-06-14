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
import { up as studyGoalsMetricFields } from "./011_study_goals_metric_fields.js";
import { up as securityEvents } from "./012_security_events.js";
import { up as adminUserLockFields } from "./013_admin_user_lock_fields.js";
import { up as documentSummaries } from "./014_document_summaries.js";
import { up as quizAiGenerationFields } from "./015_quiz_ai_generation_fields.js";
import { up as quizAttemptsEnhancements } from "./016_quiz_attempts_enhancements.js";

const schema = () => process.env.DB_SCHEMA || "learning_app";

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
  { name: "011_study_goals_metric_fields", up: studyGoalsMetricFields },
  { name: "012_security_events", up: securityEvents },
  { name: "013_admin_user_lock_fields", up: adminUserLockFields },
  { name: "014_document_summaries", up: documentSummaries },
  { name: "015_quiz_ai_generation_fields", up: quizAiGenerationFields },
  { name: "016_quiz_attempts_enhancements", up: quizAttemptsEnhancements },
];

const ensureMigrationsTable = async () => {
  const s = schema();

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${s}"."schema_migrations" (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const getAppliedMigrations = async () => {
  const s = schema();
  const [rows] = await sequelize.query(`
    SELECT name FROM "${s}"."schema_migrations" ORDER BY name
  `);

  return new Set(rows.map((row) => row.name));
};

const recordMigration = async (name) => {
  const s = schema();

  await sequelize.query(
    `
    INSERT INTO "${s}"."schema_migrations" (name)
    VALUES (:name)
    ON CONFLICT (name) DO NOTHING
    `,
    { replacements: { name } },
  );
};

const tableExists = async (tableName) => {
  const s = schema();
  const [rows] = await sequelize.query(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = :schema
      AND table_name = :tableName
    LIMIT 1
    `,
    { replacements: { schema: s, tableName } },
  );

  return rows.length > 0;
};

const columnExists = async (tableName, columnName) => {
  const s = schema();
  const [rows] = await sequelize.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = :schema
      AND table_name = :tableName
      AND column_name = :columnName
    LIMIT 1
    `,
    { replacements: { schema: s, tableName, columnName } },
  );

  return rows.length > 0;
};

/**
 * Existing databases created before schema_migrations was introduced
 * should not re-run destructive migrations (e.g. 004 drops tables).
 */
const bootstrapExistingDatabase = async (applied) => {
  if (applied.size > 0) {
    return applied;
  }

  const hasUsers = await tableExists("users");
  if (!hasUsers) {
    return applied;
  }

  console.log(
    "→ Detected existing database without migration history; bootstrapping applied migrations",
  );

  const bootstrapped = new Set(applied);

  for (const migration of migrations) {
    if (migration.name === "015_quiz_ai_generation_fields") {
      const alreadyApplied = await columnExists(
        "quizzes",
        "source_document_id",
      );
      if (alreadyApplied) {
        bootstrapped.add(migration.name);
        await recordMigration(migration.name);
      }
      continue;
    }

    if (migration.name === "016_quiz_attempts_enhancements") {
      const alreadyApplied = await columnExists(
        "quiz_attempts",
        "score_percentage",
      );
      if (alreadyApplied) {
        bootstrapped.add(migration.name);
        await recordMigration(migration.name);
      }
      continue;
    }

    bootstrapped.add(migration.name);
    await recordMigration(migration.name);
  }

  return bootstrapped;
};

const runMigrations = async () => {
  try {
    await sequelize.authenticate();
    console.log("✓ Database connection successful");

    initializeModels();
    await ensureMigrationsTable();

    let applied = await getAppliedMigrations();
    applied = await bootstrapExistingDatabase(applied);

    const pending = migrations.filter((migration) => !applied.has(migration.name));

    if (pending.length === 0) {
      console.log("✓ No pending migrations");
      process.exit(0);
    }

    for (const migration of pending) {
      console.log(`→ Running migration: ${migration.name}`);
      await migration.up(sequelize);
      await recordMigration(migration.name);
    }

    console.log("✓ All pending migrations completed");
    process.exit(0);
  } catch (error) {
    console.error("✗ Migration runner failed:", error.message);
    console.error(error);
    process.exit(1);
  }
};

runMigrations();
