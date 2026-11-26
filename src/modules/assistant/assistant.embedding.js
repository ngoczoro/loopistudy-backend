import { aiServiceClient } from "../../shared/ai/aiServiceClient.js";
import { EMBEDDING_MODEL } from "./assistant.constants.js";

const FALLBACK_EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
// Per call to the AI service: indexing sends passages in batches, a question is one text.
const SERVICE_BATCH_SIZE = 16;
const SERVICE_PASSAGE_TIMEOUT_MS = 30_000;

let pipelinePromise = null;
// The model that really computed the last vectors (the MiniLM fallback, or the service's).
// Stored with each chunk: vectors of different models cannot be compared.
let activeModel = null;

const loadPipeline = async () => {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Keep models under the project so D: has space; avoid a corrupt default cache.
      env.cacheDir = process.env.TRANSFORMERS_CACHE || "D:/ollama/hf-cache";
      env.allowLocalModels = true;
      try {
        const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
        activeModel = EMBEDDING_MODEL;
        return extractor;
      } catch (primaryError) {
        // e5 ONNX builds sometimes arrive corrupt on flaky networks; fall back to a small MiniLM.
        console.warn(
          `⚠ Primary embedding model failed (${EMBEDDING_MODEL}): ${primaryError.message}`,
        );
        const extractor = await pipeline("feature-extraction", FALLBACK_EMBEDDING_MODEL, {
          dtype: "q8",
        });
        activeModel = FALLBACK_EMBEDDING_MODEL;
        return extractor;
      }
    })().catch((error) => {
      pipelinePromise = null;
      throw error;
    });
  }
  return pipelinePromise;
};

const meanPool = (output) => {
  // Transformers.js returns Tensor-like data; normalize to a 1D number[].
  const data = output?.data ?? output;
  const dims = output?.dims;
  if (dims && dims.length === 3) {
    // [1, tokens, hidden]
    const [, tokens, hidden] = dims;
    const vector = new Array(hidden).fill(0);
    for (let t = 0; t < tokens; t += 1) {
      for (let h = 0; h < hidden; h += 1) {
        vector[h] += data[t * hidden + h];
      }
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

/**
 * Vectors from the AI service (POST /v1/embed). The service adds the e5 prefix itself.
 * Any failure throws; callers already fall back to keyword search, so the model is never
 * loaded into this backend while the service is switched on.
 */
const embedWithService = async (texts, isQuery) => {
  const vectors = [];
  for (let start = 0; start < texts.length; start += SERVICE_BATCH_SIZE) {
    const batch = texts.slice(start, start + SERVICE_BATCH_SIZE).map((text) => String(text ?? ""));
    const result = await aiServiceClient.post(
      "/v1/embed",
      { texts: batch, mode: isQuery ? "query" : "passage" },
      { timeoutMs: isQuery ? undefined : SERVICE_PASSAGE_TIMEOUT_MS },
    );
    if (!Array.isArray(result?.vectors) || result.vectors.length !== batch.length) {
      throw new Error("AI service returned the wrong number of vectors");
    }
    activeModel = result.model;
    vectors.push(...result.vectors);
  }
  return vectors;
};

/**
 * Embed texts with multilingual-e5. Passages use "passage:", queries use "query:".
 * With AI_SERVICE_URL set, the AI service computes them; otherwise this process does.
 * Throws when embedding is unavailable — callers fall back to keyword search.
 */
export const embedTexts = async (texts, { isQuery = false } = {}) => {
  if (!texts?.length) return [];
  if (aiServiceClient.enabled()) return embedWithService(texts, isQuery);

  const extractor = await loadPipeline();
  const prefix = isQuery ? "query: " : "passage: ";
  const vectors = [];

  for (const text of texts) {
    const output = await extractor(prefix + String(text ?? "").slice(0, 8000), {
      pooling: "mean",
      normalize: true,
    });
    let vector = meanPool(output);
    if (!output?.dims || output.dims.length !== 2) {
      vector = l2Normalize(vector);
    }
    vectors.push(Float32Array.from(vector));
  }

  return vectors.map((vector) => Array.from(vector));
};

export const embedQuery = async (text) => {
  const [vector] = await embedTexts([text], { isQuery: true });
  return vector;
};

/** The model behind the latest vectors; the configured e5 model before the first embed. */
export const getEmbeddingModelName = () => activeModel ?? EMBEDDING_MODEL;
