import { SCHEMA } from "../models/shared.js";

/**
 * Study groups (DA2): groups + per-member settings (role, read/clear markers, pin, mute).
 */
export async function up(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."study_groups" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description VARCHAR(500),
      avatar_url TEXT,
      avatar_public_id TEXT,
      invite_code VARCHAR(9) NOT NULL,
      owner_id UUID NOT NULL REFERENCES "${SCHEMA}"."users"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS study_groups_invite_code_unique
      ON "${SCHEMA}"."study_groups" (invite_code)
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS study_groups_owner_id_idx
      ON "${SCHEMA}"."study_groups" (owner_id)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."study_group_members" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES "${SCHEMA}"."study_groups"(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES "${SCHEMA}"."users"(id) ON DELETE CASCADE,
      role VARCHAR(10) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'member')),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cleared_at TIMESTAMPTZ,
      pinned BOOLEAN NOT NULL DEFAULT FALSE,
      muted BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT study_group_members_group_user_unique UNIQUE (group_id, user_id)
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS study_group_members_user_id_idx
      ON "${SCHEMA}"."study_group_members" (user_id)
  `);
}

export async function down(sequelize) {
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."study_group_members"`);
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."study_groups"`);
}
