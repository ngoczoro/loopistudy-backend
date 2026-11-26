import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import { createStatus } from "../src/status.js";

const KEY = "test-key";

const build = ({ env = {}, fetchImpl } = {}) => {
  const config = loadConfig({ AI_SERVICE_KEY: KEY, LOG_LEVEL: "silent", ...env });
  const logger = createLogger("silent");
  const status = createStatus(config, {
    fetchImpl: fetchImpl ?? (async () => ({ ok: true })),
  });
  return { app: createApp({ config, logger, status }), status };
};

describe("auth", () => {
  test("/health is open", async () => {
    const response = await request(build().app).get("/health");
    expect(response.status).toBe(200);
  });

  test("other routes need x-internal-key", async () => {
    const response = await request(build().app).get("/info");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: "UNAUTHORIZED", message: "Missing or invalid x-internal-key" },
    });
  });

  test("a wrong key is rejected", async () => {
    const response = await request(build().app).get("/info").set("x-internal-key", "nope");
    expect(response.status).toBe(401);
  });

  test("the right key passes", async () => {
    const response = await request(build().app).get("/info").set("x-internal-key", KEY);
    expect(response.status).toBe(200);
  });

  test("unknown paths answer 401 without the key, so routes are not revealed", async () => {
    const response = await request(build().app).get("/v1/nothing");
    expect(response.status).toBe(401);
  });
});

describe("errors", () => {
  const authed = (app) => (method, path) => request(app)[method](path).set("x-internal-key", KEY);

  test("unknown path with the key is NOT_FOUND", async () => {
    const response = await authed(build().app)("get", "/v1/nothing");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  test("broken JSON is INVALID_REQUEST", async () => {
    const response = await authed(build().app)("post", "/v1/embed")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });

  test("a body over 5 MB is PAYLOAD_TOO_LARGE", async () => {
    const response = await authed(build().app)("post", "/v1/embed")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ texts: ["x".repeat(5 * 1024 * 1024 + 10)] }));
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("request id", () => {
  test("echoes the backend's x-request-id", async () => {
    const response = await request(build().app).get("/health").set("x-request-id", "abc-123");
    expect(response.headers["x-request-id"]).toBe("abc-123");
  });

  test("creates one when missing or malformed", async () => {
    const response = await request(build().app).get("/health").set("x-request-id", "bad id!");
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("/health", () => {
  test("reports degraded until the embedding model is ready", async () => {
    const response = await request(build().app).get("/health");
    expect(response.body).toMatchObject({
      status: "degraded",
      embedding: { status: "idle", model: "Xenova/multilingual-e5-small" },
      ollama: { status: "up", model: "qwen2.5:3b" },
      openai: { configured: false },
    });
    expect(typeof response.body.uptimeSec).toBe("number");
  });

  test("is ok once embedding is ready and an LLM is usable", async () => {
    const { app, status } = build();
    status.setEmbedding({ status: "ready" });
    const response = await request(app).get("/health");
    expect(response.body.status).toBe("ok");
  });

  test("Ollama down and no OpenAI key is degraded", async () => {
    const { app, status } = build({
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    status.setEmbedding({ status: "ready" });
    const response = await request(app).get("/health");
    expect(response.body.ollama.status).toBe("down");
    expect(response.body.status).toBe("degraded");
  });

  test("an empty OLLAMA_URL disables Ollama without calling it", async () => {
    let called = false;
    const { app } = build({
      env: { OLLAMA_URL: "" },
      fetchImpl: async () => {
        called = true;
        return { ok: true };
      },
    });
    const response = await request(app).get("/health");
    expect(response.body.ollama.status).toBe("disabled");
    expect(called).toBe(false);
  });

  test("Ollama is checked at most once per 10 seconds", async () => {
    let calls = 0;
    const { app } = build({
      fetchImpl: async () => {
        calls += 1;
        return { ok: true };
      },
    });
    await Promise.all([request(app).get("/health"), request(app).get("/health")]);
    await request(app).get("/health");
    expect(calls).toBe(1);
  });
});

describe("/info", () => {
  test("lists models and embedding limits", async () => {
    const response = await request(build({ env: { OPENAI_API_KEY: "sk-test" } }).app)
      .get("/info")
      .set("x-internal-key", KEY);
    expect(response.body).toEqual({
      version: "1.0.0",
      embedding: {
        model: "Xenova/multilingual-e5-small",
        dimensions: 384,
        maxTexts: 64,
        maxCharsPerText: 8000,
      },
      llm: {
        ollama: { enabled: true, model: "qwen2.5:3b" },
        openai: { enabled: true, model: "gpt-4.1-mini" },
      },
    });
  });

  test("never exposes the keys", async () => {
    const response = await request(build({ env: { OPENAI_API_KEY: "sk-test" } }).app)
      .get("/info")
      .set("x-internal-key", KEY);
    expect(JSON.stringify(response.body)).not.toMatch(/sk-test|test-key/);
  });
});
