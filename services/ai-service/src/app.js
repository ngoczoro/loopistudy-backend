import { readFileSync } from "node:fs";
import express from "express";
import { requireInternalKey } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { requestLog } from "./middleware/requestLog.js";
import { healthRouter } from "./routes/health.js";
import { infoRouter } from "./routes/info.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

/**
 * Builds the Express app without listening, so tests can drive it with supertest.
 * Only /health is open; everything mounted after the key check needs `x-internal-key`.
 */
export const createApp = ({ config, logger, status }) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestLog(logger));
  app.use(express.json({ limit: "5mb" }));

  app.use(healthRouter({ status }));

  app.use(requireInternalKey(config.key));
  app.use(infoRouter({ config, version }));
  // Phase 2+: /v1/embed, /v1/llm/json, /v1/llm/chat, /v1/llm/chat/stream mount here.

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
};
