/**
 * Indexes to support focus session analytics aggregations and filters.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_status
    ON "${s}"."focus_sessions" (user_id, status)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed
    ON "${s}"."focus_sessions" (user_id, completed_at DESC)
    WHERE status IN ('completed', 'cancelled')
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_planner
    ON "${s}"."focus_sessions" (planner_session_id)
    WHERE planner_session_id IS NOT NULL
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_subject
    ON "${s}"."focus_sessions" (user_id, subject_id, completed_at DESC)
  `);
}

export async function down(sequelize) {
  const s = schema();
  await sequelize.query(`DROP INDEX IF EXISTS "${s}".idx_focus_sessions_subject`);
  await sequelize.query(`DROP INDEX IF EXISTS "${s}".idx_focus_sessions_planner`);
  await sequelize.query(`DROP INDEX IF EXISTS "${s}".idx_focus_sessions_user_completed`);
  await sequelize.query(`DROP INDEX IF EXISTS "${s}".idx_focus_sessions_user_status`);
}
