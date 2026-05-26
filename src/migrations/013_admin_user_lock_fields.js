/**
 * Migration 013 — Admin user lock audit fields on users table.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();

  await sequelize.query(`
    ALTER TABLE "${s}"."users"
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."users"
      ADD COLUMN IF NOT EXISTS locked_reason TEXT
  `);

  console.log(`✓ Migration 013 completed for schema "${s}"`);
}

export async function down(sequelize) {
  const s = schema();

  await sequelize.query(`
    ALTER TABLE "${s}"."users"
      DROP COLUMN IF EXISTS locked_reason
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."users"
      DROP COLUMN IF EXISTS locked_at
  `);
}
