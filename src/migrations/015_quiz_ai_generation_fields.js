/**
 * Migration 015 — AI quiz generation metadata on quizzes table.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      ADD COLUMN IF NOT EXISTS source_document_id UUID
        REFERENCES "${s}"."content_items"(id) ON DELETE SET NULL
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100)
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      ADD COLUMN IF NOT EXISTS generation_difficulty VARCHAR(10)
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      ADD COLUMN IF NOT EXISTS generation_question_count INTEGER
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      ADD COLUMN IF NOT EXISTS description TEXT
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_quizzes_ai_generation_lookup
      ON "${s}"."quizzes" (
        user_id,
        source_document_id,
        generation_difficulty,
        generation_question_count
      )
      WHERE source = 'ai_generated' AND deleted_at IS NULL
  `);

  console.log(`✓ Migration 015 completed for schema "${s}"`);
}

export async function down(sequelize) {
  const s = schema();

  await sequelize.query(`
    DROP INDEX IF EXISTS "${s}".idx_quizzes_ai_generation_lookup
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      DROP COLUMN IF EXISTS description
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      DROP COLUMN IF EXISTS generation_question_count
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      DROP COLUMN IF EXISTS generation_difficulty
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      DROP COLUMN IF EXISTS ai_model
  `);

  await sequelize.query(`
    ALTER TABLE "${s}"."quizzes"
      DROP COLUMN IF EXISTS source_document_id
  `);
}
