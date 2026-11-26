#!/usr/bin/env node
/**
 * Checks that the AI service computes the same vectors as this backend (API.md, /v1/embed:
 * cosine ≥ 0.999). Run it before switching AI_SERVICE_URL on: when it passes, the vectors
 * already stored in document_chunks stay valid and nothing has to be re-indexed.
 *
 *   AI_SERVICE_URL=http://localhost:5100 AI_SERVICE_KEY=... node scripts/ai-service/compare-embeddings.mjs
 *
 * Loads the embedding model in this process too (the local side), so the first run can be slow.
 */
import "../../src/config/loadEnv.js";

const MIN_COSINE = 0.999;
const SERVICE_URL = process.env.AI_SERVICE_URL;
if (!SERVICE_URL || !process.env.AI_SERVICE_KEY) {
  console.error("Set AI_SERVICE_URL and AI_SERVICE_KEY (the running AI service).");
  process.exit(1);
}

const { embedTexts, getEmbeddingModelName } = await import(
  "../../src/modules/assistant/assistant.embedding.js"
);

const PASSAGES = [
  "Điện toán đám mây là mô hình cung cấp tài nguyên máy tính qua internet, trả tiền theo mức sử dụng.",
  "Slide 3: What is Cloud computing - Store, manage, and access data online",
  "Tính kế thừa (Inheritance) cho phép lớp con dùng lại thuộc tính và phương thức của lớp cha.",
  "Tế bào nhân thực có màng nhân bao bọc vật chất di truyền; tế bào nhân sơ thì không.",
  "x".repeat(9000), // longer than the 8000-character cut on both sides
];
const QUERIES = ["Cloud computing là gì?", "Ưu và nhược điểm của điện toán đám mây?"];

const cosine = (a, b) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

const embedBoth = async (texts, isQuery) => {
  delete process.env.AI_SERVICE_URL;
  const local = await embedTexts(texts, { isQuery });
  const localModel = getEmbeddingModelName();
  process.env.AI_SERVICE_URL = SERVICE_URL;
  const remote = await embedTexts(texts, { isQuery });
  const remoteModel = getEmbeddingModelName();
  return { local, remote, localModel, remoteModel };
};

const rows = [];
let models = null;
for (const [texts, isQuery] of [
  [PASSAGES, false],
  [QUERIES, true],
]) {
  const { local, remote, localModel, remoteModel } = await embedBoth(texts, isQuery);
  models ??= { local: localModel, service: remoteModel };
  texts.forEach((text, i) => {
    rows.push({
      mode: isQuery ? "query" : "passage",
      text: text.length > 50 ? `${text.slice(0, 47)}...` : text,
      dims: `${local[i].length}/${remote[i].length}`,
      cosine: Number(cosine(local[i], remote[i]).toFixed(6)),
    });
  });
}

console.log("Models:", models);
console.table(rows);
const worst = Math.min(...rows.map((row) => row.cosine));
const sameModel = models.local === models.service;
const pass = sameModel && worst >= MIN_COSINE;
console.log(
  pass
    ? `PASS: lowest cosine ${worst} ≥ ${MIN_COSINE}, same model. Safe to switch, no re-index needed.`
    : `FAIL: ${sameModel ? `lowest cosine ${worst} < ${MIN_COSINE}` : "the two sides use different models"}.`,
);
process.exit(pass ? 0 : 1);
