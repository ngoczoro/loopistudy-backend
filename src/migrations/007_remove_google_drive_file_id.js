/**
 * Migration 007 — Remove google_drive_file_id from content_items.
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
    console.log(`✓ Migration 007 completed for schema "${s}"`);
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Migration 007 failed:", error);
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
