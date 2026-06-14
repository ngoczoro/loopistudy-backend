/**
 * Migration 017 — AI external learning resource recommendations (Phase 6).
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${s}"."ai_resource_recommendation_histories" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      subject_id UUID,
      query VARCHAR(100) NOT NULL,
      normalized_query VARCHAR(100) NOT NULL,
      resources JSONB NOT NULL DEFAULT '[]'::jsonb,
      learning_path JSONB,
      model VARCHAR(100),
      last_viewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ai_resource_rec_hist_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
      CONSTRAINT ai_resource_rec_hist_subject_id_fkey
        FOREIGN KEY (subject_id) REFERENCES "${s}"."subjects"(id) ON DELETE SET NULL
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_resource_rec_hist_user_normalized
      ON "${s}"."ai_resource_recommendation_histories" (user_id, normalized_query, subject_id)
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_resource_rec_hist_user_created
      ON "${s}"."ai_resource_recommendation_histories" (user_id, created_at DESC)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${s}"."saved_learning_resources" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      subject_id UUID,
      resource_id VARCHAR(120) NOT NULL,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      provider VARCHAR(120) NOT NULL,
      url TEXT NOT NULL,
      reason TEXT,
      topics JSONB DEFAULT '[]'::jsonb,
      source_query VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT saved_learning_resources_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
      CONSTRAINT saved_learning_resources_subject_id_fkey
        FOREIGN KEY (subject_id) REFERENCES "${s}"."subjects"(id) ON DELETE SET NULL
    )
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_learning_resources_user_url
      ON "${s}"."saved_learning_resources" (user_id, url)
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saved_learning_resources_user_subject
      ON "${s}"."saved_learning_resources" (user_id, subject_id, created_at DESC)
  `);

  console.log(`✓ Migration 017 completed for schema "${s}"`);
}

export async function down(sequelize) {
  const s = schema();

  await sequelize.query(`
    DROP TABLE IF EXISTS "${s}"."saved_learning_resources"
  `);

  await sequelize.query(`
    DROP TABLE IF EXISTS "${s}"."ai_resource_recommendation_histories"
  `);
}
