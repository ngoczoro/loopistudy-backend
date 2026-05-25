/**
 * Migration 009 — Tasks Phase 3 fields (description, completed_at).
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

const q = (sequelize, sql, transaction) =>
  sequelize.query(sql, { transaction });

export async function up(sequelize) {
  const s = schema();
  const transaction = await sequelize.transaction();

  try {
    await q(
      sequelize,
      `ALTER TABLE "${s}"."tasks"
         ADD COLUMN IF NOT EXISTS description TEXT NULL`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."tasks"
         ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL`,
      transaction,
    );

    await q(
      sequelize,
      `CREATE INDEX IF NOT EXISTS idx_tasks_user_completed
         ON "${s}"."tasks" (user_id, completed)`,
      transaction,
    );

    await transaction.commit();
    console.log(`✓ Migration 009 completed for schema "${s}"`);
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Migration 009 failed:", error);
    throw error;
  }
}

export async function down(sequelize) {
  const s = schema();
  const transaction = await sequelize.transaction();

  try {
    await q(
      sequelize,
      `DROP INDEX IF EXISTS "${s}".idx_tasks_user_completed`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."tasks"
         DROP COLUMN IF EXISTS completed_at`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."tasks"
         DROP COLUMN IF EXISTS description`,
      transaction,
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
