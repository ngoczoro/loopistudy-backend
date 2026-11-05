import {
  INDEX_MAX_ATTEMPTS,
  INDEX_STATUS,
} from "./assistant.constants.js";
import {
  ASSISTANT_CHUNKER_VERSION,
  splitForRag,
  splitPdfByPages,
} from "./assistant.chunker.js";
import {
  UnsupportedDocumentError,
  extractForRag,
  foldVietnamese,
} from "./assistant.extract.js";
import { embedTexts, getEmbeddingModelName } from "./assistant.embedding.js";
import * as indexRepository from "./assistant.index.repository.js";

const backoffMs = (attempts) => Math.min(60 * 60 * 1000, 2 ** attempts * 60_000);

/** Fingerprint content + chunker version so boundary fixes trigger a reindex. */
export const indexFingerprint = (contentHash) =>
  `${contentHash}:c${ASSISTANT_CHUNKER_VERSION}`;

export const indexContent = async (contentId) => {
  const content = await indexRepository.findContentForIndex(contentId);
  if (!content || content.deletedAt) {
    await indexRepository.deleteIndexData(contentId);
    return { status: "deleted" };
  }

  const statusRow = await indexRepository.upsertIndexStatus(contentId, content.userId, {
    status: INDEX_STATUS.INDEXING,
  });

  try {
    if (content.type === "link") {
      await indexRepository.markUnsupported(contentId, content.userId, "Links are not indexed");
      await indexRepository.replaceChunks(contentId, content.userId, [], {
        embeddingModel: getEmbeddingModelName(),
      });
      return { status: INDEX_STATUS.UNSUPPORTED };
    }

    const extracted = await extractForRag(content);
    const fingerprint = indexFingerprint(extracted.contentHash);
    if (
      statusRow.contentHash &&
      statusRow.contentHash === fingerprint &&
      statusRow.indexedAt &&
      statusRow.chunkCount > 0
    ) {
      const missingEmbeddings = await indexRepository.countChunksMissingEmbedding(contentId);
      if (missingEmbeddings === 0) {
        await statusRow.update({
          status: INDEX_STATUS.INDEXED,
          nextAttemptAt: null,
          lastError: null,
        });
        return { status: INDEX_STATUS.INDEXED, skipped: true };
      }

      // Text index is current but vectors were skipped earlier (corrupt e5, etc.).
      try {
        const existing = await indexRepository.listChunksPlain(contentId);
        const vectors = await embedTexts(existing.map((chunk) => chunk.chunkText));
        const modelName = getEmbeddingModelName();
        await indexRepository.updateChunkEmbeddings(
          existing.map((chunk, i) => ({
            id: chunk.id,
            embedding: vectors[i] ?? null,
          })),
          modelName,
        );
        await statusRow.update({
          status: INDEX_STATUS.INDEXED,
          nextAttemptAt: null,
          lastError: null,
        });
        return {
          status: INDEX_STATUS.INDEXED,
          chunkCount: existing.length,
          embeddingOk: true,
          embeddingBackfill: true,
        };
      } catch (error) {
        await statusRow.update({
          status: INDEX_STATUS.INDEXED,
          nextAttemptAt: null,
          lastError: error.message,
        });
        console.warn(`⚠ Embedding backfill failed for ${contentId}:`, error.message);
        return { status: INDEX_STATUS.INDEXED, skipped: true, embeddingOk: false };
      }
    }

    let chunks =
      extracted.kind === "pdf" ? splitPdfByPages(extracted.text) : null;
    if (!chunks) chunks = splitForRag(extracted.text);

    const prepared = chunks.map((chunk) => ({
      ...chunk,
      foldedText: foldVietnamese(chunk.chunkText),
      embedding: null,
    }));

    // Persist text + tsvector first so keyword search works even if embedding fails.
    await indexRepository.replaceChunks(contentId, content.userId, prepared, {
      embeddingModel: getEmbeddingModelName(),
    });

    let embeddingError = null;
    try {
      const vectors = await embedTexts(prepared.map((chunk) => chunk.chunkText));
      prepared.forEach((chunk, i) => {
        chunk.embedding = vectors[i] ?? null;
      });
      await indexRepository.replaceChunks(contentId, content.userId, prepared, {
        embeddingModel: getEmbeddingModelName(),
      });
    } catch (error) {
      embeddingError = error.message;
      console.warn(
        `⚠ Embedding failed for ${contentId}, keyword index kept:`,
        error.message,
      );
    }

    await statusRow.update({
      status: INDEX_STATUS.INDEXED,
      contentHash: fingerprint,
      chunkCount: prepared.length,
      attempts: 0,
      nextAttemptAt: null,
      lastError: embeddingError,
      indexedAt: new Date(),
    });

    return {
      status: INDEX_STATUS.INDEXED,
      chunkCount: prepared.length,
      embeddingOk: !embeddingError,
    };
  } catch (error) {
    if (error instanceof UnsupportedDocumentError) {
      await indexRepository.markUnsupported(contentId, content.userId, error.message);
      await indexRepository.replaceChunks(contentId, content.userId, [], {
        embeddingModel: getEmbeddingModelName(),
      });
      return { status: INDEX_STATUS.UNSUPPORTED };
    }

    const attempts = (statusRow.attempts || 0) + 1;
    const failedPermanently = attempts >= INDEX_MAX_ATTEMPTS;
    await statusRow.update({
      status: failedPermanently ? INDEX_STATUS.FAILED : INDEX_STATUS.NOT_INDEXED,
      attempts,
      lastError: error.message,
      nextAttemptAt: failedPermanently ? null : new Date(Date.now() + backoffMs(attempts)),
    });
    console.error(`✗ Index failed for ${contentId}:`, error.message);
    return { status: failedPermanently ? INDEX_STATUS.FAILED : "retry" };
  }
};

export const enqueueContent = async (contentId, userId, options) => {
  if (!contentId || !userId) return;
  await indexRepository.markForIndexing(contentId, userId, options);
};
