import { SCHEMA } from "../models/shared.js";

/**
 * Planner setting: max daily study hours when generating schedules.
 */
export async function up(sequelize) {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."user_preferences"
      ADD COLUMN IF NOT EXISTS max_study_hours_per_day NUMERIC(4,1) NOT NULL DEFAULT 4
  `);

  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."user_preferences"
      DROP CONSTRAINT IF EXISTS user_preferences_max_study_hours_check
  `);

  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."user_preferences"
      ADD CONSTRAINT user_preferences_max_study_hours_check
      CHECK (max_study_hours_per_day >= 1 AND max_study_hours_per_day <= 12)
  `);
}

export async function down(sequelize) {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."user_preferences"
      DROP CONSTRAINT IF EXISTS user_preferences_max_study_hours_check
  `);

  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."user_preferences"
      DROP COLUMN IF EXISTS max_study_hours_per_day
  `);
}
