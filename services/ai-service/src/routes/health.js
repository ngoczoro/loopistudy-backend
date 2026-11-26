import { Router } from "express";

/** GET /health: open (no key), always 200 while the process is alive. See API.md. */
export const healthRouter = ({ status, queue = null, startedAt = Date.now() }) => {
  const router = Router();
  router.get("/health", async (_req, res) => {
    const snapshot = await status.snapshot();
    res.json({
      status: snapshot.status,
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      embedding: snapshot.embedding,
      ollama: snapshot.ollama,
      openai: snapshot.openai,
      ...(queue ? { queue: queue.stats() } : {}),
    });
  });
  return router;
};
