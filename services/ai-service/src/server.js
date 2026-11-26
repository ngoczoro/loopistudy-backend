import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createEmbedder } from "./embedding.js";
import { createLogger } from "./logger.js";
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
const app = createApp({ config, logger, status, embedder });

// Load the model now so the first request does not wait for it (or download it).
if (config.embedding.preload) embedder.preload();

const server = app.listen(config.port, () => {
  logger.info(`AI service listening on http://localhost:${config.port}`);
  logger.info(
    `Ollama: ${config.ollama.url || "disabled"} (${config.ollama.model}) · ` +
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
