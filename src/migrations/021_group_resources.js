import { SCHEMA } from "../models/shared.js";

/**
 * Study group shared resources: manual links, or snapshots of the sharer's notes/files.
 */
export async function up(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."group_resources" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES "${SCHEMA}"."study_groups"(id) ON DELETE CASCADE,
      shared_by UUID REFERENCES "${SCHEMA}"."users"(id) ON DELETE SET NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('link', 'note', 'file')),
      title VARCHAR(200) NOT NULL,
      description VARCHAR(500),
      url TEXT,
      ref_id UUID,
      ref_snapshot JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS group_resources_group_created_idx
      ON "${SCHEMA}"."group_resources" (group_id, created_at DESC)
  `);
}

export async function down(sequelize) {
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."group_resources"`);
}
