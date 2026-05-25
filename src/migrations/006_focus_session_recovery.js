/**
 * Add timer recovery fields to focus_sessions.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    ADD COLUMN IF NOT EXISTS current_phase VARCHAR(10) NOT NULL DEFAULT 'work'
      CHECK (current_phase IN ('work', 'break'))
  `);
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    ADD COLUMN IF NOT EXISTS phase_ends_at TIMESTAMPTZ
  `);
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER
  `);
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    ADD COLUMN IF NOT EXISTS work_elapsed_seconds INTEGER NOT NULL DEFAULT 0
  `);
}

export async function down(sequelize) {
  const s = schema();
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    DROP COLUMN IF EXISTS work_elapsed_seconds
  `);
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    DROP COLUMN IF EXISTS remaining_seconds
  `);
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    DROP COLUMN IF EXISTS phase_ends_at
  `);
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    DROP COLUMN IF EXISTS current_phase
  `);
}
