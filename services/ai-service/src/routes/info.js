import { Router } from "express";

export const EMBEDDING_LIMITS = Object.freeze({ dimensions: 384, maxTexts: 64, maxCharsPerText: 8000 });

/** GET /info: models and limits the backend can rely on. Needs the key. See API.md. */
export const infoRouter = ({ config, version }) => {
  const router = Router();
  router.get("/info", (_req, res) => {
    res.json({
      version,
      embedding: { model: config.embedding.model, ...EMBEDDING_LIMITS },
      llm: {
        ollama: { enabled: Boolean(config.ollama.url), model: config.ollama.model },
        openai: { enabled: Boolean(config.openai.apiKey), model: config.openai.model },
      },
    });
  });
  return router;
};
