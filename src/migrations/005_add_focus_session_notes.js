/**
 * Add optional notes/goals to focus_sessions.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    ADD COLUMN IF NOT EXISTS notes TEXT
  `);
}

export async function down(sequelize) {
  const s = schema();
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    DROP COLUMN IF EXISTS notes
  `);
}
