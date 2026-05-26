import { SCHEMA } from "../models/shared.js";

/**
 * Phase 2 goals: metric_key + timezone (computed progress metadata).
 * Legacy rows default to metric_key=manual and remain valid.
 */
export async function up(sequelize) {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_goals"
      ADD COLUMN IF NOT EXISTS metric_key VARCHAR(30) NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'UTC'
  `);

  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_goals"
      DROP CONSTRAINT IF EXISTS study_goals_period_check
  `);
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_goals"
      ADD CONSTRAINT study_goals_period_check
      CHECK (period IN ('daily', 'weekly', 'monthly'))
  `);
}

export async function down(sequelize) {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_goals"
      DROP COLUMN IF EXISTS metric_key,
      DROP COLUMN IF EXISTS timezone
  `);
}
