const OLLAMA_CHECK_TTL_MS = 10_000;
const OLLAMA_CHECK_TIMEOUT_MS = 2_000;

/**
 * What /health reports about the models.
 * - embedding: `idle` until the model starts loading (phase 2 sets loading/ready/failed).
 * - ollama: asks Ollama's /api/tags at most every 10 s; `disabled` when OLLAMA_URL is empty.
 * `fetchImpl` and `now` are injectable for tests.
 */
export const createStatus = (config, { fetchImpl = fetch, now = Date.now } = {}) => {
  const embedding = { status: "idle", model: config.embedding.model, error: null };
  let ollamaCheck = null; // { status, at }
  let pending = null;

  const checkOllama = async () => {
    try {
      const response = await fetchImpl(`${config.ollama.url}/api/tags`, {
        signal: AbortSignal.timeout(OLLAMA_CHECK_TIMEOUT_MS),
      });
      return response.ok ? "up" : "down";
    } catch {
      return "down";
    }
  };

  const ollamaStatus = async () => {
    if (!config.ollama.url) return "disabled";
    if (ollamaCheck && now() - ollamaCheck.at < OLLAMA_CHECK_TTL_MS) return ollamaCheck.status;
    // Concurrent /health calls share one check.
    pending ??= checkOllama().then((status) => {
      ollamaCheck = { status, at: now() };
      pending = null;
      return status;
    });
    return pending;
  };

  return {
    /** Phase 2 calls this while it loads the embedding model. */
    setEmbedding(update) {
      Object.assign(embedding, update);
    },

    async snapshot() {
      const ollama = await ollamaStatus();
      const openaiConfigured = Boolean(config.openai.apiKey);
      const llmUsable = ollama === "up" || openaiConfigured;
      return {
        status: embedding.status === "ready" && llmUsable ? "ok" : "degraded",
        embedding: { status: embedding.status, model: embedding.model },
        ollama: { status: ollama, model: config.ollama.model },
        openai: { configured: openaiConfigured, model: config.openai.model },
      };
    },
  };
};
