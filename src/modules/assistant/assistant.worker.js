import {
  INDEX_BATCH_SIZE,
  INDEX_WORKER_INTERVAL_MS,
} from "./assistant.constants.js";
import * as indexRepository from "./assistant.index.repository.js";
import { indexContent } from "./assistant.indexer.js";

let timer = null;
let running = false;

const recoverStuckJobs = async () => {
  // Crash mid-job can leave rows stuck on "indexing".
  await indexRepository.releaseStuckIndexing();
};

const tick = async () => {
  if (running) return;
  running = true;
  try {
    await recoverStuckJobs();
    await indexRepository.purgeOrphanedIndexData();
    await indexRepository.enqueueChunkerMigration();
    await indexRepository.enqueueMissingEmbeddings();
    await indexRepository.enqueueMissingContent();
    const jobs = await indexRepository.claimNextJobs(INDEX_BATCH_SIZE);
    for (const job of jobs) {
      const result = await indexContent(job.contentId);
      if (result?.status === "indexed" && (!result.skipped || result.embeddingBackfill)) {
        console.log(
          `✓ Indexed ${job.contentId} (${result.chunkCount} chunks, embed=${result.embeddingOk}${
            result.embeddingBackfill ? ", backfill" : ""
          })`,
        );
      }
    }
  } catch (error) {
    console.error("✗ Assistant index worker failed:", error.message);
  } finally {
    running = false;
  }
};

export const startAssistantIndexWorker = () => {
  if (timer || process.env.ASSISTANT_INDEX_ENABLED === "false") return;
  timer = setInterval(tick, INDEX_WORKER_INTERVAL_MS);
  // Catch up shortly after boot so Ask AI becomes usable without waiting a full interval.
  setTimeout(tick, 3_000);
  console.log(
    `✓ Assistant index worker started (every ${Math.round(INDEX_WORKER_INTERVAL_MS / 1000)}s)`,
  );
};

export const runIndexWorkerOnce = () => tick();
