/**
 * Migration 011 — Align focus_sessions with Sequelize model + analytics SQL.
 * Idempotent: safe if 005_add_focus_session_notes / 006_focus_session_recovery were skipped.
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
      `ALTER TABLE "${s}"."focus_sessions"
         ADD COLUMN IF NOT EXISTS notes TEXT`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         ADD COLUMN IF NOT EXISTS current_phase VARCHAR(10) DEFAULT 'work'`,
      transaction,
    );

    await q(
      sequelize,
      `UPDATE "${s}"."focus_sessions"
         SET current_phase = 'work'
       WHERE current_phase IS NULL`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         ADD COLUMN IF NOT EXISTS phase_ends_at TIMESTAMPTZ`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         ADD COLUMN IF NOT EXISTS work_elapsed_seconds INTEGER DEFAULT 0`,
      transaction,
    );

    await q(
      sequelize,
      `UPDATE "${s}"."focus_sessions"
         SET work_elapsed_seconds = 0
       WHERE work_elapsed_seconds IS NULL`,
      transaction,
    );

    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         ALTER COLUMN subject_id DROP NOT NULL`,
      transaction,
    );

    await transaction.commit();
    console.log(`✓ Migration 011 completed for schema "${s}"`);
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Migration 011 failed:", error);
    throw error;
  }
}

export async function down(sequelize) {
  const s = schema();
  const transaction = await sequelize.transaction();

  try {
    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         DROP COLUMN IF EXISTS work_elapsed_seconds`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         DROP COLUMN IF EXISTS remaining_seconds`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         DROP COLUMN IF EXISTS phase_ends_at`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         DROP COLUMN IF EXISTS current_phase`,
      transaction,
    );
    await q(
      sequelize,
      `ALTER TABLE "${s}"."focus_sessions"
         DROP COLUMN IF EXISTS notes`,
      transaction,
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
