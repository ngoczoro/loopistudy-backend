import { SCHEMA } from "../models/shared.js";

/**
 * Study group chat: messages + uploaded attachments (links are parsed from content).
 */
export async function up(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."group_messages" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES "${SCHEMA}"."study_groups"(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES "${SCHEMA}"."users"(id) ON DELETE SET NULL,
      content VARCHAR(2000) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS group_messages_group_created_idx
      ON "${SCHEMA}"."group_messages" (group_id, created_at DESC, id DESC)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."group_message_attachments" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES "${SCHEMA}"."group_messages"(id) ON DELETE CASCADE,
      group_id UUID NOT NULL REFERENCES "${SCHEMA}"."study_groups"(id) ON DELETE CASCADE,
      kind VARCHAR(10) NOT NULL CHECK (kind IN ('image', 'file')),
      name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(150) NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      public_id TEXT,
      position SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS group_message_attachments_message_idx
      ON "${SCHEMA}"."group_message_attachments" (message_id)
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS group_message_attachments_group_kind_idx
      ON "${SCHEMA}"."group_message_attachments" (group_id, kind, created_at DESC)
  `);
}

export async function down(sequelize) {
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."group_message_attachments"`);
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."group_messages"`);
}
