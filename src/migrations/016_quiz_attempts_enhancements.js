/**
 * Migration 016 — Quiz attempt scoring and metadata fields.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      ADD COLUMN IF NOT EXISTS total_questions INTEGER
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      ADD COLUMN IF NOT EXISTS correct_count INTEGER
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      ADD COLUMN IF NOT EXISTS score_percentage NUMERIC(5, 2)
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      ADD COLUMN IF NOT EXISTS duration_seconds INTEGER
  `);

  await sequelize.query(`
    UPDATE "${s}"."quiz_attempts"
    SET
      total_questions = COALESCE(total_questions, total, 0),
      correct_count = COALESCE(correct_count, score, 0),
      score_percentage = COALESCE(
        score_percentage,
        CASE
          WHEN COALESCE(total, 0) > 0
          THEN ROUND((COALESCE(score, 0)::numeric / total::numeric) * 100, 2)
          ELSE 0
        END
      ),
      submitted_at = COALESCE(submitted_at, created_at),
      duration_seconds = COALESCE(duration_seconds, time_spent_seconds)
    WHERE total_questions IS NULL
       OR correct_count IS NULL
       OR score_percentage IS NULL
       OR submitted_at IS NULL
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_submitted
      ON "${s}"."quiz_attempts" (user_id, submitted_at DESC)
  `);

  console.log(`✓ Migration 016 completed for schema "${s}"`);
}

export async function down(sequelize) {
  const s = schema();

  await sequelize.query(`
    DROP INDEX IF EXISTS "${s}".idx_quiz_attempts_user_submitted
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      DROP COLUMN IF EXISTS duration_seconds
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      DROP COLUMN IF EXISTS submitted_at
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      DROP COLUMN IF EXISTS started_at
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      DROP COLUMN IF EXISTS score_percentage
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      DROP COLUMN IF EXISTS correct_count
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quiz_attempts"
      DROP COLUMN IF EXISTS total_questions
  `);
}
