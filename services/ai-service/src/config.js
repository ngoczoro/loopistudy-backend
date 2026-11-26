/**
 * Reads and checks the service settings once. Every setting is listed in API.md.
 * Throws when a required setting is missing, so the service never starts half-configured.
 */
const number = (value, fallback, name) => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number (got "${value}")`);
  }
  return parsed;
};

const text = (value, fallback) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
};

/** `env` defaults to process.env; tests pass their own object. */
export const loadConfig = (env = process.env) => {
  const key = text(env.AI_SERVICE_KEY, "");
  if (!key) throw new Error("AI_SERVICE_KEY is required (the backend sends it as x-internal-key)");

  return Object.freeze({
    port: number(env.PORT, 5100, "PORT"),
    key,
    logLevel: text(env.LOG_LEVEL, "info"),
    embedding: Object.freeze({
      model: text(env.EMBEDDING_MODEL, "Xenova/multilingual-e5-small"),
      cacheDir: text(env.TRANSFORMERS_CACHE, "./.hf-cache"),
      preload: text(env.EMBEDDING_PRELOAD, "true") !== "false",
    }),
    ollama: Object.freeze({
      // An explicitly empty OLLAMA_URL turns Ollama off, like in the backend.
      url: (env.OLLAMA_URL === undefined ? "http://127.0.0.1:11434" : String(env.OLLAMA_URL))
        .trim()
        .replace(/\/$/, ""),
      model: text(env.OLLAMA_MODEL, "qwen2.5:3b"),
      keepAlive: text(env.OLLAMA_KEEP_ALIVE, "30m"),
      concurrency: Math.max(1, number(env.OLLAMA_CONCURRENCY, 1, "OLLAMA_CONCURRENCY")),
      maxQueue: number(env.OLLAMA_MAX_QUEUE, 3, "OLLAMA_MAX_QUEUE"),
      warmUp: text(env.OLLAMA_WARMUP, "true") !== "false",
    }),
    openai: Object.freeze({
      apiKey: text(env.OPENAI_API_KEY, ""),
      model: text(env.OPENAI_MODEL, "gpt-4.1-mini"),
    }),
  });
};
