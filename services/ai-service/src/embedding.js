import { ServiceError } from "./errors.js";

// Same fallback as the backend: e5 ONNX builds sometimes arrive corrupt on flaky networks.
export const FALLBACK_EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const MAX_CHARS = 8000;

const loadTransformersPipeline = async (model, cacheDir) => {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.cacheDir = cacheDir;
  env.allowLocalModels = true;
  return pipeline("feature-extraction", model, { dtype: "q8" });
};

// Copied from the backend's assistant.embedding.js so vectors stay identical (API.md: cosine ≥ 0.999).
const meanPool = (output) => {
  const data = output?.data ?? output;
  const dims = output?.dims;
  if (dims && dims.length === 3) {
    const [, tokens, hidden] = dims;
    const vector = new Array(hidden).fill(0);
    for (let t = 0; t < tokens; t += 1) {
      for (let h = 0; h < hidden; h += 1) vector[h] += data[t * hidden + h];
    }
    for (let h = 0; h < hidden; h += 1) vector[h] /= tokens;
    return vector;
  }
  if (Array.isArray(data)) {
    if (Array.isArray(data[0])) {
      const tokens = data.length;
      const hidden = data[0].length;
      const vector = new Array(hidden).fill(0);
      for (const row of data) {
        for (let h = 0; h < hidden; h += 1) vector[h] += row[h];
      }
      return vector.map((v) => v / tokens);
    }
    return [...data];
  }
  return Array.from(data);
};

const l2Normalize = (vector) => {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
};

const notReady = (message) => new ServiceError(503, "MODEL_NOT_READY", message);

/**
 * The embedding model, loaded once. Reports idle → loading → ready | failed to `status`.
 * Requests that arrive before the model is ready get MODEL_NOT_READY at once (the backend
 * then searches by keyword), so a slow first download never holds a request open.
 * `loadPipeline(model, cacheDir)` is injectable for tests.
 */
export const createEmbedder = (
  config,
  { status, logger, loadPipeline = loadTransformersPipeline } = {},
) => {
  let extractor = null;
  let activeModel = null;
  let loading = null;

  const load = () => {
    loading ??= (async () => {
      status?.setEmbedding({ status: "loading" });
      const started = Date.now();
      try {
        try {
          extractor = await loadPipeline(config.embedding.model, config.embedding.cacheDir);
          activeModel = config.embedding.model;
        } catch (primaryError) {
          logger?.warn(
            `Embedding model ${config.embedding.model} failed (${primaryError.message}), ` +
              `using ${FALLBACK_EMBEDDING_MODEL}`,
          );
          extractor = await loadPipeline(FALLBACK_EMBEDDING_MODEL, config.embedding.cacheDir);
          activeModel = FALLBACK_EMBEDDING_MODEL;
        }
        status?.setEmbedding({ status: "ready", model: activeModel });
        logger?.info(`Embedding model ready: ${activeModel} (${Date.now() - started}ms)`);
      } catch (error) {
        status?.setEmbedding({ status: "failed" });
        logger?.error(`Embedding model could not be loaded: ${error.message}`);
        loading = null; // the next request tries again
        throw error;
      }
    })();
    return loading;
  };

  return {
    /** Starts loading in the background (EMBEDDING_PRELOAD). Never throws. */
    preload() {
      load().catch(() => {});
    },

    /** `{ model, dimensions, vectors }` for `texts`; `mode` picks the e5 prefix. */
    async embed(texts, mode) {
      if (!extractor) {
        const wasLoading = Boolean(loading);
        load().catch(() => {});
        throw notReady(
          wasLoading ? "Embedding model is loading" : "Embedding model is not loaded yet",
        );
      }

      const prefix = mode === "query" ? "query: " : "passage: ";
      const vectors = [];
      for (const text of texts) {
        const output = await extractor(prefix + String(text).slice(0, MAX_CHARS), {
          pooling: "mean",
          normalize: true,
        });
        let vector = meanPool(output);
        if (!output?.dims || output.dims.length !== 2) vector = l2Normalize(vector);
        vectors.push(Array.from(Float32Array.from(vector)));
      }
      return { model: activeModel, dimensions: vectors[0]?.length ?? 0, vectors };
    },
  };
};
