import { SCHEMA } from "../models/shared.js";

/**
 * Ask AI (assistant) conversations + RAG storage.
 * Chunk embeddings are REAL[] (no pgvector required); search_tsv supports keyword fallback.
 */
export async function up(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."assistant_conversations" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "${SCHEMA}"."users"(id) ON DELETE CASCADE,
      title VARCHAR(100) NOT NULL DEFAULT 'New chat',
      title_edited BOOLEAN NOT NULL DEFAULT FALSE,
      scope JSONB NOT NULL DEFAULT '{"type":"all"}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS assistant_conversations_user_updated_idx
      ON "${SCHEMA}"."assistant_conversations" (user_id, updated_at DESC)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."assistant_messages" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES "${SCHEMA}"."assistant_conversations"(id) ON DELETE CASCADE,
      role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      answer_status VARCHAR(20) CHECK (
        answer_status IS NULL OR answer_status IN ('answered', 'not_found', 'no_sources')
      ),
      citations JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS assistant_messages_conversation_created_idx
      ON "${SCHEMA}"."assistant_messages" (conversation_id, created_at ASC, id ASC)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."document_index_status" (
      content_id UUID PRIMARY KEY REFERENCES "${SCHEMA}"."content_items"(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES "${SCHEMA}"."users"(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'not_indexed'
        CHECK (status IN ('indexed', 'indexing', 'stale', 'not_indexed', 'failed', 'unsupported')),
      content_hash VARCHAR(64),
      chunk_count INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ,
      last_error TEXT,
      indexed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS document_index_status_queue_idx
      ON "${SCHEMA}"."document_index_status" (status, next_attempt_at)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."document_chunks" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "${SCHEMA}"."users"(id) ON DELETE CASCADE,
      content_id UUID NOT NULL REFERENCES "${SCHEMA}"."content_items"(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      location VARCHAR(100),
      embedding REAL[],
      embedding_model VARCHAR(100),
      search_tsv TSVECTOR,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (content_id, chunk_index)
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS document_chunks_user_content_idx
      ON "${SCHEMA}"."document_chunks" (user_id, content_id)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS document_chunks_search_tsv_idx
      ON "${SCHEMA}"."document_chunks" USING GIN (search_tsv)
  `);
}

export async function down(sequelize) {
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."document_chunks"`);
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."document_index_status"`);
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."assistant_messages"`);
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."assistant_conversations"`);
}
