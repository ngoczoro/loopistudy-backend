import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createEmbedder, FALLBACK_EMBEDDING_MODEL } from "../src/embedding.js";
import { createLogger } from "../src/logger.js";
import { createStatus } from "../src/status.js";

const KEY = "test-key";
const PRIMARY = "Xenova/multilingual-e5-small";

/** A fake pipeline: the vector encodes the text length and the prefix, unnormalized. */
const fakeExtractor = (dims = 3) => async (input) => ({
  data: Float32Array.from({ length: dims }, (_, i) => (i === 0 ? input.length : 1)),
  dims: [1, dims],
});

const build = ({ loadPipeline = async () => fakeExtractor() } = {}) => {
  const config = loadConfig({ AI_SERVICE_KEY: KEY, LOG_LEVEL: "silent" });
  const logger = createLogger("silent");
  const status = createStatus(config, { fetchImpl: async () => ({ ok: true }) });
  const calls = [];
  const embedder = createEmbedder(config, {
    status,
    logger,
    loadPipeline: async (model, cacheDir) => {
      calls.push({ model, cacheDir });
      return loadPipeline(model, cacheDir);
    },
  });
  const app = createApp({ config, logger, status, embedder });
  const embed = (body) => request(app).post("/v1/embed").set("x-internal-key", KEY).send(body);
  return { app, embedder, status, calls, embed };
};

const ready = async (built) => {
  built.embedder.preload();
  await new Promise((resolve) => setImmediate(resolve));
  return built;
};

describe("POST /v1/embed", () => {
  test("needs the key", async () => {
    const { app } = await ready(build());
    const response = await request(app).post("/v1/embed").send({ texts: ["a"], mode: "query" });
    expect(response.status).toBe(401);
  });

  test("returns one vector per text, in order, with model and dimensions", async () => {
    const { embed } = await ready(build());
    const response = await embed({ texts: ["ab", "abcd"], mode: "passage" });
    expect(response.status).toBe(200);
    expect(response.body.model).toBe(PRIMARY);
    expect(response.body.dimensions).toBe(3);
    expect(response.body.vectors).toHaveLength(2);
    // "passage: ab" is 11 characters, "passage: abcd" is 13.
    expect(response.body.vectors[0][0]).toBe(11);
    expect(response.body.vectors[1][0]).toBe(13);
  });

  test("adds the e5 prefix for the mode", async () => {
    const seen = [];
    const { embed } = await ready(
      build({
        loadPipeline: async () => async (input) => {
          seen.push(input);
          return { data: Float32Array.from([1, 0, 0]), dims: [1, 3] };
        },
      }),
    );
    await embed({ texts: ["xin chào"], mode: "query" });
    await embed({ texts: ["xin chào"], mode: "passage" });
    expect(seen).toEqual(["query: xin chào", "passage: xin chào"]);
  });

  test("cuts texts to 8000 characters instead of failing", async () => {
    const seen = [];
    const { embed } = await ready(
      build({
        loadPipeline: async () => async (input) => {
          seen.push(input);
          return { data: Float32Array.from([1, 0, 0]), dims: [1, 3] };
        },
      }),
    );
    const response = await embed({ texts: ["x".repeat(9000)], mode: "passage" });
    expect(response.status).toBe(200);
    expect(seen[0]).toHaveLength("passage: ".length + 8000);
  });

  test("normalizes token-level output (mean pool + L2) like the backend", async () => {
    const { embed } = await ready(
      build({
        // 2 tokens × 2 hidden: mean is [2, 0], normalized [1, 0].
        loadPipeline: async () => async () => ({ data: [1, 0, 3, 0], dims: [1, 2, 2] }),
      }),
    );
    const response = await embed({ texts: ["a"], mode: "query" });
    expect(response.body.vectors[0]).toEqual([1, 0]);
  });

  test.each([
    [{}, /texts/],
    [{ texts: [], mode: "query" }, /texts/],
    [{ texts: ["a", 2], mode: "query" }, /string/],
    [{ texts: Array(65).fill("a"), mode: "query" }, /at most 64/],
    [{ texts: ["a"] }, /mode/],
    [{ texts: ["a"], mode: "both" }, /mode/],
  ])("rejects %j", async (body, message) => {
    const { embed } = await ready(build());
    const response = await embed(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
    expect(response.body.error.message).toMatch(message);
  });
});

describe("model loading", () => {
  test("answers MODEL_NOT_READY while loading, then works", async () => {
    let finish;
    const { embed, status } = build({
      loadPipeline: () =>
        new Promise((resolve) => {
          finish = () => resolve(fakeExtractor());
        }),
    });
    const first = await embed({ texts: ["a"], mode: "query" });
    expect(first.status).toBe(503);
    expect(first.body.error.code).toBe("MODEL_NOT_READY");
    expect((await status.snapshot()).embedding.status).toBe("loading");

    finish();
    await new Promise((resolve) => setImmediate(resolve));
    const second = await embed({ texts: ["a"], mode: "query" });
    expect(second.status).toBe(200);
    expect((await status.snapshot()).embedding.status).toBe("ready");
  });

  test("loads once even when many requests arrive", async () => {
    const built = build();
    await Promise.all([1, 2, 3].map(() => built.embed({ texts: ["a"], mode: "query" })));
    await new Promise((resolve) => setImmediate(resolve));
    expect(built.calls).toHaveLength(1);
  });

  test("falls back to MiniLM and reports the model really used", async () => {
    const { embed, status } = await ready(
      build({
        loadPipeline: async (model) => {
          if (model === PRIMARY) throw new Error("corrupt onnx");
          return fakeExtractor();
        },
      }),
    );
    const response = await embed({ texts: ["a"], mode: "query" });
    expect(response.body.model).toBe(FALLBACK_EMBEDDING_MODEL);
    expect((await status.snapshot()).embedding.model).toBe(FALLBACK_EMBEDDING_MODEL);
  });

  test("reports failed when both models fail, and tries again on the next request", async () => {
    let attempts = 0;
    const { embed, status } = await ready(
      build({
        loadPipeline: async () => {
          attempts += 1;
          if (attempts <= 2) throw new Error("offline");
          return fakeExtractor();
        },
      }),
    );
    expect((await status.snapshot()).embedding.status).toBe("failed");
    const retry = await embed({ texts: ["a"], mode: "query" });
    expect(retry.status).toBe(503);
    await new Promise((resolve) => setImmediate(resolve));
    expect((await embed({ texts: ["a"], mode: "query" })).status).toBe(200);
  });
});
