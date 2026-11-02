import { EMBEDDING_MODEL } from "./assistant.constants.js";

let pipelinePromise = null;

const loadPipeline = async () => {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Keep models under the project so D: has space; avoid a corrupt default cache.
      env.cacheDir = process.env.TRANSFORMERS_CACHE || "D:/ollama/hf-cache";
      env.allowLocalModels = true;
      try {
        return await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
      } catch (primaryError) {
        // e5 ONNX builds sometimes arrive corrupt on flaky networks; fall back to a small MiniLM.
        console.warn(
          `⚠ Primary embedding model failed (${EMBEDDING_MODEL}): ${primaryError.message}`,
        );
        const fallback = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
        return pipeline("feature-extraction", fallback, { dtype: "q8" });
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
 * Embed texts with multilingual-e5. Passages use "passage:", queries use "query:".
 * Returns null vectors skipped — caller should tolerate embedding failures.
 */
export const embedTexts = async (texts, { isQuery = false } = {}) => {
  if (!texts?.length) return [];
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

export const getEmbeddingModelName = () => EMBEDDING_MODEL;
