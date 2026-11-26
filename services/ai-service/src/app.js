import { readFileSync } from "node:fs";
import express from "express";
import { requireInternalKey } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { requestLog } from "./middleware/requestLog.js";
import { embedRouter } from "./routes/embed.js";
import { healthRouter } from "./routes/health.js";
import { infoRouter } from "./routes/info.js";
import { llmRouter } from "./routes/llm.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

/**
 * Builds the Express app without listening, so tests can drive it with supertest.
 * Only /health is open; everything mounted after the key check needs `x-internal-key`.
 */
export const createApp = ({ config, logger, status, embedder, providers, queue = null }) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestLog(logger));
  app.use(express.json({ limit: "5mb" }));

  app.use(healthRouter({ status, queue }));

  app.use(requireInternalKey(config.key));
  app.use(infoRouter({ config, version }));
  if (embedder) app.use(embedRouter({ embedder }));
  if (providers) app.use(llmRouter({ providers }));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
};
