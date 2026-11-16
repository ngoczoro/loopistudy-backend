import { SCHEMA } from "../models/shared.js";

/**
 * document_chunks may already exist from an earlier 023 run that used
 * CREATE TABLE IF NOT EXISTS, so the search_tsv column was never added.
 * Keyword indexing updates that column and fails without it.
 */
export const up = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."document_chunks"
      ADD COLUMN IF NOT EXISTS search_tsv TSVECTOR
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS document_chunks_search_tsv_idx
      ON "${SCHEMA}"."document_chunks" USING GIN (search_tsv)
  `);
  await sequelize.query(`
    UPDATE "${SCHEMA}"."document_index_status"
    SET status = 'not_indexed',
        attempts = 0,
        next_attempt_at = NOW(),
        last_error = NULL,
        updated_at = NOW()
    WHERE status = 'failed'
      AND last_error ILIKE '%search_tsv%'
  `);
};

export const down = async (sequelize) => {
  await sequelize.query(`
    DROP INDEX IF EXISTS "${SCHEMA}".document_chunks_search_tsv_idx
  `);
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."document_chunks"
      DROP COLUMN IF EXISTS search_tsv
  `);
};
