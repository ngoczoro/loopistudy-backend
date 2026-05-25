/**
 * Migration 008 — Ensure google_drive_file_id is removed from content_items.
 * Safe to run even if the column was already dropped in migration 007.
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
      `ALTER TABLE "${s}"."content_items"
         DROP COLUMN IF EXISTS google_drive_file_id`,
      transaction,
    );

    await transaction.commit();
    console.log(`✓ Migration 008 completed for schema "${s}"`);
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Migration 008 failed:", error);
    throw error;
  }
}

export async function down(sequelize) {
  const s = schema();
  const transaction = await sequelize.transaction();

  try {
    await q(
      sequelize,
      `ALTER TABLE "${s}"."content_items"
         ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT`,
      transaction,
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
