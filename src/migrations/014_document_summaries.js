/**
 * Migration 014 — AI document summaries (Phase 2).
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${s}"."document_summaries" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL,
      summary TEXT NOT NULL,
      key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
      learning_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      model VARCHAR(100),
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT document_summaries_document_id_unique UNIQUE (document_id),
      CONSTRAINT document_summaries_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES "${s}"."content_items"(id) ON DELETE CASCADE,
      CONSTRAINT document_summaries_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES "${s}"."users"(id) ON DELETE CASCADE
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_document_summaries_document_id
      ON "${s}"."document_summaries" (document_id)
  `);

  console.log(`✓ Migration 014 completed for schema "${s}"`);
}

export async function down(sequelize) {
  const s = schema();

  await sequelize.query(`
    DROP TABLE IF EXISTS "${s}"."document_summaries"
  `);
}
