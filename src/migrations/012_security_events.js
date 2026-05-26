/**
 * Migration 012 — security_events audit table for suspicious activity monitoring.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${s}"."security_events" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(50) NOT NULL,
      user_id UUID NULL REFERENCES "${s}"."users"(id) ON DELETE SET NULL,
      ip_address VARCHAR(45),
      endpoint VARCHAR(255),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_security_events_created_at
      ON "${s}"."security_events" (created_at DESC)
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_security_events_event_type
      ON "${s}"."security_events" (event_type)
  `);

  console.log(`✓ Migration 012 completed for schema "${s}"`);
}

export async function down(sequelize) {
  const s = schema();
  await sequelize.query(`DROP TABLE IF EXISTS "${s}"."security_events" CASCADE`);
}
