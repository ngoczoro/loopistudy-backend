import sequelize from "../../config/database.js";

const SCHEMA = process.env.DB_SCHEMA || "learning_app";

const FOCUS_SESSION_COLUMNS = [
  "notes",
  "current_phase",
  "phase_ends_at",
  "remaining_seconds",
  "work_elapsed_seconds",
];

export const verifyFocusSessionSchema = async () => {
  try {
    const rows = await sequelize.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = :schema
         AND table_name = 'focus_sessions'`,
      {
        replacements: { schema: SCHEMA },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    const existing = new Set(rows.map((row) => row.column_name));
    const missing = FOCUS_SESSION_COLUMNS.filter((col) => !existing.has(col));

    if (missing.length > 0) {
      console.warn(
        `[schema] focus_sessions missing columns: ${missing.join(", ")} — run npm run db:migrate`,
      );
      return { ok: false, missing };
    }

    console.log("[schema] focus_sessions columns verified");
    return { ok: true, missing: [] };
  } catch (error) {
    console.warn("[schema] focus_sessions verification failed:", error.message);
    return { ok: false, error: error.message };
  }
};
