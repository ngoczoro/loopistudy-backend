import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createEmbedder } from "./embedding.js";
import { createOllama } from "./providers/ollama.js";
import { createOpenAI } from "./providers/openai.js";
import { createLogger } from "./logger.js";
import { createQueue, withQueue } from "./queue.js";
import { createStatus } from "./status.js";

const SHUTDOWN_GRACE_MS = 10_000;

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`[ai-service] Invalid configuration: ${error.message}`);
  process.exit(1);
}

const logger = createLogger(config.logLevel);
const status = createStatus(config);
const embedder = createEmbedder(config, { status, logger });
// Ollama on one CPU answers one request at a time: every call waits its turn here.
// OpenAI needs no queue.
const ollamaQueue = createQueue({
  concurrency: config.ollama.concurrency,
  maxWaiting: config.ollama.maxQueue,
});
const ollama = createOllama(config);
const providers = { ollama: withQueue(ollama, ollamaQueue), openai: createOpenAI(config) };
const app = createApp({ config, logger, status, embedder, providers, queue: ollamaQueue });

// Load the models now so the first request does not wait for them (or download them).
if (config.embedding.preload) embedder.preload();
if (config.ollama.url && config.ollama.warmUp) {
  ollama.warmUp().then(({ ok, ms, error }) =>
    ok
      ? logger.info(`Ollama model ${config.ollama.model} loaded (${ms}ms)`)
      : logger.warn(`Ollama warm-up failed: ${error}`),
  );
}

const server = app.listen(config.port, () => {
  logger.info(`AI service listening on http://localhost:${config.port}`);
  logger.info(
    `Ollama: ${config.ollama.url || "disabled"} (${config.ollama.model}, ` +
      `${config.ollama.concurrency} at a time, up to ${config.ollama.maxQueue} waiting) · ` +
      `OpenAI: ${config.openai.apiKey ? config.openai.model : "disabled"}`,
  );
});

// Stop taking new requests, let running ones finish, then exit (Docker sends SIGTERM).
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => {
    logger.warn("Requests still running after the grace period, exiting");
    process.exit(1);
  }, SHUTDOWN_GRACE_MS).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
