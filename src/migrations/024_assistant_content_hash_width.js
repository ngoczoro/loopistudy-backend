import { SCHEMA } from "../models/shared.js";

/**
 * content_hash was VARCHAR(64) for raw sha256. Chunker fingerprints append `:cN`
 * (e.g. 67 chars) which broke every reindex with "value too long".
 */
export const up = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."document_index_status"
      ALTER COLUMN content_hash TYPE VARCHAR(96)
  `);
};

export const down = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."document_index_status"
      ALTER COLUMN content_hash TYPE VARCHAR(64)
  `);
};
