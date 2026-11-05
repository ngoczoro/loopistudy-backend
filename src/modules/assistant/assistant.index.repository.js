import { Op, QueryTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { CONTENT_TYPE } from "../../config/constants.js";
import { SCHEMA } from "../../models/shared.js";
import { ASSISTANT_CHUNKER_VERSION } from "./assistant.chunker.js";
import { INDEX_STATUS } from "./assistant.constants.js";

const ContentItem = () => sequelize.models.ContentItem;
const DocumentIndexStatus = () => sequelize.models.DocumentIndexStatus;
const DocumentChunk = () => sequelize.models.DocumentChunk;
const Subject = () => sequelize.models.Subject;

export const upsertIndexStatus = async (contentId, userId, patch = {}) => {
  const [row] = await DocumentIndexStatus().findOrCreate({
    where: { contentId },
    defaults: {
      contentId,
      userId,
      status: INDEX_STATUS.NOT_INDEXED,
      chunkCount: 0,
      attempts: 0,
      ...patch,
    },
  });
  if (Object.keys(patch).length) await row.update(patch);
  return row;
};

export const markForIndexing = async (contentId, userId, { stale = false } = {}) => {
  const existing = await DocumentIndexStatus().findByPk(contentId);
  if (!existing) {
    return upsertIndexStatus(contentId, userId, {
      status: INDEX_STATUS.NOT_INDEXED,
      nextAttemptAt: new Date(),
      attempts: 0,
      lastError: null,
    });
  }

  const wasIndexed = existing.status === INDEX_STATUS.INDEXED || Boolean(existing.indexedAt);
  return existing.update({
    status: stale && wasIndexed ? INDEX_STATUS.STALE : INDEX_STATUS.NOT_INDEXED,
    nextAttemptAt: new Date(),
    attempts: 0,
    lastError: null,
  });
};

export const markUnsupported = async (contentId, userId, reason) =>
  upsertIndexStatus(contentId, userId, {
    status: INDEX_STATUS.UNSUPPORTED,
    chunkCount: 0,
    lastError: reason,
    nextAttemptAt: null,
  });

export const releaseStuckIndexing = async () => {
  await DocumentIndexStatus().update(
    {
      status: INDEX_STATUS.NOT_INDEXED,
      nextAttemptAt: new Date(),
      lastError: "Recovered after interrupted indexing",
    },
    {
      where: {
        status: INDEX_STATUS.INDEXING,
        updatedAt: { [Op.lt]: new Date(Date.now() - 2 * 60_000) },
      },
    },
  );
};

export const claimNextJobs = async (limit) => {
  const now = new Date();
  return sequelize.transaction(async (transaction) => {
    const rows = await DocumentIndexStatus().findAll({
      where: {
        status: {
          [Op.in]: [
            INDEX_STATUS.NOT_INDEXED,
            INDEX_STATUS.STALE,
            INDEX_STATUS.FAILED,
          ],
        },
        [Op.or]: [{ nextAttemptAt: null }, { nextAttemptAt: { [Op.lte]: now } }],
      },
      order: [
        ["nextAttemptAt", "ASC"],
        ["updatedAt", "ASC"],
      ],
      limit,
      lock: true,
      skipLocked: true,
      transaction,
    });

    for (const row of rows) {
      await row.update({ status: INDEX_STATUS.INDEXING }, { transaction });
    }
    return rows;
  });
};

export const findContentForIndex = async (contentId) =>
  ContentItem().findByPk(contentId, {
    include: [{ model: Subject(), as: "subject", attributes: ["id", "name"], required: false }],
  });

export const replaceChunks = async (contentId, userId, chunks, { embeddingModel }) =>
  sequelize.transaction(async (transaction) => {
    await DocumentChunk().destroy({ where: { contentId }, transaction });

    if (chunks.length === 0) return;

    await DocumentChunk().bulkCreate(
      chunks.map((chunk) => ({
        userId,
        contentId,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        location: chunk.location,
        embedding: chunk.embedding ?? null,
        embeddingModel: chunk.embedding ? embeddingModel : null,
      })),
      { transaction },
    );

    // Fill tsvector from folded text for keyword search (simple config, no accents).
    for (const chunk of chunks) {
      await sequelize.query(
        `
        UPDATE "${SCHEMA}"."document_chunks"
        SET search_tsv = to_tsvector('simple', :folded)
        WHERE content_id = :contentId AND chunk_index = :chunkIndex
        `,
        {
          replacements: {
            folded: chunk.foldedText,
            contentId,
            chunkIndex: chunk.chunkIndex,
          },
          transaction,
        },
      );
    }
  });

export const deleteIndexData = async (contentId) => {
  await DocumentChunk().destroy({ where: { contentId } });
  await DocumentIndexStatus().destroy({ where: { contentId } });
};

export const countChunksMissingEmbedding = async (contentId) =>
  DocumentChunk().count({
    where: {
      contentId,
      [Op.or]: [{ embedding: null }, { embeddingModel: null }],
    },
  });

export const listChunksPlain = async (contentId) =>
  DocumentChunk().findAll({
    where: { contentId },
    order: [["chunkIndex", "ASC"]],
  });

export const updateChunkEmbeddings = async (rows, embeddingModel) => {
  for (const row of rows) {
    await DocumentChunk().update(
      {
        embedding: row.embedding,
        embeddingModel: row.embedding ? embeddingModel : null,
      },
      { where: { id: row.id } },
    );
  }
};

/** Queue docs that are indexed as text-only so embeddings can be backfilled. */
export const enqueueMissingEmbeddings = async () => {
  await sequelize.query(
    `
    UPDATE "${SCHEMA}"."document_index_status" s
    SET status = 'stale',
        attempts = 0,
        next_attempt_at = NOW(),
        updated_at = NOW()
    WHERE s.status = 'indexed'
      AND s.chunk_count > 0
      AND EXISTS (
        SELECT 1 FROM "${SCHEMA}"."document_chunks" dc
        WHERE dc.content_id = s.content_id
          AND (dc.embedding IS NULL OR dc.embedding_model IS NULL)
      )
    `,
  );
};

/** Content ids in scope that still have a usable previous or current index. */
export const listSearchableContentIds = async (userId, scope) => {
  const whereContent = {
    userId,
    type: { [Op.in]: [CONTENT_TYPE.NOTE, CONTENT_TYPE.FILE] },
  };
  if (scope?.type === "subject") whereContent.subjectId = scope.subjectId;
  if (scope?.type === "documents") whereContent.id = { [Op.in]: scope.documentIds };

  const items = await ContentItem().findAll({
    where: whereContent,
    attributes: ["id"],
    include: [
      {
        model: DocumentIndexStatus(),
        as: "indexStatus",
        required: true,
        where: {
          [Op.or]: [
            { status: INDEX_STATUS.INDEXED },
            {
              // Keep Ask AI usable while a reindex/retry is queued (old chunks still present).
              status: {
                [Op.in]: [
                  INDEX_STATUS.STALE,
                  INDEX_STATUS.INDEXING,
                  INDEX_STATUS.NOT_INDEXED,
                ],
              },
              indexedAt: { [Op.ne]: null },
              chunkCount: { [Op.gt]: 0 },
            },
          ],
        },
      },
    ],
  });
  return items.map((item) => item.id);
};

export const listChunksForContents = async (userId, contentIds) => {
  if (!contentIds.length) return [];
  return DocumentChunk().findAll({
    where: { userId, contentId: { [Op.in]: contentIds } },
    include: [
      {
        model: ContentItem(),
        as: "content",
        attributes: ["id", "title", "subjectId"],
        // required: soft-deleted notes/files must not be retrievable
        required: true,
        include: [
          { model: Subject(), as: "subject", attributes: ["id", "name"], required: false },
        ],
      },
    ],
    order: [
      ["contentId", "ASC"],
      ["chunkIndex", "ASC"],
    ],
  });
};

/** Remove RAG rows whose content was soft-deleted (FK ON DELETE CASCADE does not fire on paranoid). */
export const purgeOrphanedIndexData = async () => {
  await sequelize.query(
    `
    DELETE FROM "${SCHEMA}"."document_chunks" dc
    WHERE NOT EXISTS (
      SELECT 1 FROM "${SCHEMA}"."content_items" c
      WHERE c.id = dc.content_id AND c.deleted_at IS NULL
    )
    `,
  );
  await sequelize.query(
    `
    DELETE FROM "${SCHEMA}"."document_index_status" s
    WHERE NOT EXISTS (
      SELECT 1 FROM "${SCHEMA}"."content_items" c
      WHERE c.id = s.content_id AND c.deleted_at IS NULL
    )
    `,
  );
};

/** Re-chunk docs indexed before the current chunker version (e.g. section-aware split). */
export const enqueueChunkerMigration = async () => {
  const suffix = `:c${ASSISTANT_CHUNKER_VERSION}`;
  await sequelize.query(
    `
    UPDATE "${SCHEMA}"."document_index_status"
    SET status = 'stale',
        attempts = 0,
        last_error = NULL,
        next_attempt_at = NOW(),
        updated_at = NOW()
    WHERE status IN ('indexed', 'stale', 'failed', 'not_indexed')
      AND indexed_at IS NOT NULL
      AND chunk_count > 0
      AND (content_hash IS NULL OR content_hash NOT LIKE :suffix)
    `,
    { replacements: { suffix: `%${suffix}` } },
  );
};

/** Enqueue every note/file that has no index row yet (first boot / catch-up). */
export const enqueueMissingContent = async () => {
  await sequelize.query(
    `
    INSERT INTO "${SCHEMA}"."document_index_status"
      (content_id, user_id, status, chunk_count, attempts, next_attempt_at, created_at, updated_at)
    SELECT c.id, c.user_id, 'not_indexed', 0, 0, NOW(), NOW(), NOW()
    FROM "${SCHEMA}"."content_items" c
    WHERE c.deleted_at IS NULL
      AND c.type IN ('note', 'file')
      AND NOT EXISTS (
        SELECT 1 FROM "${SCHEMA}"."document_index_status" s WHERE s.content_id = c.id
      )
    `,
    { type: QueryTypes.INSERT },
  );
};
