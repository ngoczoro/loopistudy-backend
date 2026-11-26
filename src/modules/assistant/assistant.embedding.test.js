import { jest } from "@jest/globals";
import { embedQuery, embedTexts, getEmbeddingModelName } from "./assistant.embedding.js";

// With AI_SERVICE_URL set, embeddings come from the AI service (POST /v1/embed).
describe("embedTexts through the AI service", () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.AI_SERVICE_URL;

  beforeEach(() => {
    process.env.AI_SERVICE_URL = "http://ai-test:5100";
    process.env.AI_SERVICE_KEY = "k";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = originalUrl;
    delete process.env.AI_SERVICE_KEY;
  });

  const serviceAnswering = (model = "Xenova/multilingual-e5-small") => {
    const bodies = [];
    globalThis.fetch = jest.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          model,
          dimensions: 2,
          vectors: body.texts.map((text) => [text.length, 0]),
        }),
      };
    });
    return bodies;
  };

  test("sends passages in batches of 16 and keeps the order", async () => {
    const bodies = serviceAnswering();
    const texts = Array.from({ length: 20 }, (_, i) => "x".repeat(i + 1));
    const vectors = await embedTexts(texts);
    expect(bodies.map((body) => body.texts.length)).toEqual([16, 4]);
    expect(bodies.every((body) => body.mode === "passage")).toBe(true);
    expect(vectors.map((vector) => vector[0])).toEqual(texts.map((text) => text.length));
  });

  test("sends the raw text as a query: the service adds the e5 prefix", async () => {
    const bodies = serviceAnswering();
    await embedQuery("Cloud computing là gì?");
    expect(bodies[0]).toEqual({ texts: ["Cloud computing là gì?"], mode: "query" });
  });

  test("records the model the service really used", async () => {
    serviceAnswering("Xenova/paraphrase-multilingual-MiniLM-L12-v2");
    await embedTexts(["a"]);
    expect(getEmbeddingModelName()).toBe("Xenova/paraphrase-multilingual-MiniLM-L12-v2");
  });

  test("throws when the service fails, so callers fall back to keyword search", async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      headers: { get: () => null },
      json: async () => ({ error: { code: "MODEL_NOT_READY", message: "Embedding model is loading" } }),
    }));
    await expect(embedTexts(["a"])).rejects.toThrow("Embedding model is loading");
  });

  test("rejects an answer with the wrong number of vectors", async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ model: "m", dimensions: 2, vectors: [[1, 0]] }),
    }));
    await expect(embedTexts(["a", "b"])).rejects.toThrow("wrong number of vectors");
  });
});
