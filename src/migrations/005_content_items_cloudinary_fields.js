/**
 * Migration 005 — Add Cloudinary + metadata fields to content_items.
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
         ADD COLUMN IF NOT EXISTS description TEXT`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."content_items"
         ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."content_items"
         ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT`,
      transaction,
    );

    await transaction.commit();
    console.log(`✓ Migration 005 completed for schema "${s}"`);
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Migration 005 failed:", error);
    throw error;
  }
}

export async function down(sequelize) {
  const s = schema();
  const transaction = await sequelize.transaction();

  try {
    await q(
      sequelize,
      `ALTER TABLE "${s}"."content_items" DROP COLUMN IF EXISTS cloudinary_public_id`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."content_items" DROP COLUMN IF EXISTS file_name`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."content_items" DROP COLUMN IF EXISTS description`,
      transaction,
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
