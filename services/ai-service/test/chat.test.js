import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import { providerError, providerTimeout } from "../src/providers/errors.js";
import { createOllama } from "../src/providers/ollama.js";
import { createOpenAI } from "../src/providers/openai.js";
import { createStatus } from "../src/status.js";

const KEY = "test-key";
const BASE = { system: "Chỉ trả lời từ tài liệu.", user: "Câu hỏi: Cloud computing là gì?" };

const config = (env = {}) =>
  loadConfig({ AI_SERVICE_KEY: KEY, LOG_LEVEL: "silent", OPENAI_API_KEY: "sk-test", ...env });

const appWith = (providers) =>
  createApp({
    config: config(),
    logger: createLogger("silent"),
    status: createStatus(config(), { fetchImpl: async () => ({ ok: true }) }),
    providers,
  });

/** A provider whose stream yields `tokens`, then optionally throws `failAfter`. */
const fakeProvider = ({ tokens = [], failAfter = null, failBefore = null, seen = [] } = {}) => ({
  model: "fake-model",
  async chat(args) {
    seen.push(args);
    return { model: "fake-model", content: tokens.join("") };
  },
  async *stream(args) {
    seen.push(args);
    if (failBefore) throw failBefore;
    for (const token of tokens) yield token;
    if (failAfter) throw failAfter;
  },
});

const parseEvents = (text) =>
  text
    .split("\n\n")
    .filter(Boolean)
    .map((block) => ({
      event: block.match(/^event: (.+)$/m)?.[1],
      data: JSON.parse(block.match(/^data: (.*)$/m)?.[1] ?? "null"),
    }));

const stream = (app, body) =>
  request(app).post("/v1/llm/chat/stream").set("x-internal-key", KEY).send(body);

describe("POST /v1/llm/chat", () => {
  test("returns the raw answer with Ask AI's defaults", async () => {
    const seen = [];
    const app = appWith({ ollama: fakeProvider({ tokens: ["Điện toán ", "đám mây [1]"], seen }) });
    const response = await request(app)
      .post("/v1/llm/chat")
      .set("x-internal-key", KEY)
      .send({ provider: "ollama", ...BASE });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ provider: "ollama", model: "fake-model", content: "Điện toán đám mây [1]" });
    expect(seen[0]).toMatchObject({ maxTokens: 512, temperature: 0.2, timeoutMs: 60_000 });
  });
});

describe("POST /v1/llm/chat/stream", () => {
  test("sends start, then each token, then done", async () => {
    const app = appWith({ ollama: fakeProvider({ tokens: ["Điện", " toán", " đám mây"] }) });
    const response = await stream(app, { provider: "ollama", ...BASE, timeoutMs: 60_000 });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(response.headers["x-accel-buffering"]).toBe("no");
    expect(response.headers["cache-control"]).toMatch(/no-cache/);
    const events = parseEvents(response.text);
    expect(events.map((e) => e.event)).toEqual(["start", "token", "token", "token", "done"]);
    expect(events[0].data).toEqual({ provider: "ollama", model: "fake-model" });
    expect(events.slice(1, 4).map((e) => e.data.text).join("")).toBe("Điện toán đám mây");
    expect(events[4].data).toMatchObject({ tokens: 3 });
  });

  test("an error before the first token is a plain JSON error, not a stream", async () => {
    const app = appWith({ ollama: fakeProvider({ failBefore: providerTimeout("Ollama", 60_000) }) });
    const response = await stream(app, { provider: "ollama", ...BASE });
    expect(response.status).toBe(504);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body.error).toEqual({ code: "PROVIDER_TIMEOUT", message: "Ollama timed out after 60000ms" });
  });

  test("an error after tokens ends the stream with an error event", async () => {
    const app = appWith({
      openai: fakeProvider({ tokens: ["Một", " nửa"], failAfter: providerError("OpenAI", "connection reset") }),
    });
    const events = parseEvents((await stream(app, { provider: "openai", ...BASE })).text);
    expect(events.map((e) => e.event)).toEqual(["start", "token", "token", "error"]);
    expect(events[3].data).toEqual({ code: "PROVIDER_ERROR", message: "OpenAI failed: connection reset" });
  });

  test("no tokens at all is INVALID_MODEL_OUTPUT", async () => {
    const response = await stream(appWith({ ollama: fakeProvider({ tokens: [] }) }), { provider: "ollama", ...BASE });
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("INVALID_MODEL_OUTPUT");
  });

  test("rejects a bad request before calling the model", async () => {
    const seen = [];
    const app = appWith({ ollama: fakeProvider({ tokens: ["x"], seen }) });
    const response = await stream(app, { provider: "ollama", system: "s" });
    expect(response.status).toBe(400);
    expect(seen).toHaveLength(0);
  });

  test("closing the connection cancels the provider call", async () => {
    let providerSignal;
    let release;
    const provider = {
      model: "m",
      async *stream({ signal }) {
        providerSignal = signal;
        yield "first";
        await new Promise((resolve) => {
          release = resolve;
          signal.addEventListener("abort", resolve, { once: true });
        });
        if (signal.aborted) throw providerError("Ollama", "aborted");
        yield "never";
      },
    };
    const server = appWith({ ollama: provider }).listen(0);
    const { port } = server.address();
    try {
      const controller = new AbortController();
      const response = await fetch(`http://127.0.0.1:${port}/v1/llm/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": KEY },
        body: JSON.stringify({ provider: "ollama", ...BASE }),
        signal: controller.signal,
      });
      const reader = response.body.getReader();
      await reader.read(); // start + first token
      controller.abort();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(providerSignal.aborted).toBe(true);
    } finally {
      release?.();
      server.close();
    }
  });
});

/** A fetch Response-like object whose body yields `chunks` as bytes. */
const streamingResponse = (chunks) => ({
  ok: true,
  status: 200,
  body: (async function* () {
    for (const chunk of chunks) yield new TextEncoder().encode(chunk);
  })(),
});

const collect = async (iterable) => {
  const out = [];
  for await (const item of iterable) out.push(item);
  return out;
};

describe("Ollama provider streaming", () => {
  test("reads NDJSON split across chunks and sends the backend's request", async () => {
    const calls = [];
    const ollama = createOllama(config(), {
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) });
        return streamingResponse([
          '{"message":{"content":"Điện"}}\n{"message":{"con',
          'tent":" toán"}}\n',
          '{"message":{"content":""},"done":true}\n',
        ]);
      },
    });
    const tokens = await collect(ollama.stream({ ...BASE, maxTokens: 512, temperature: 0.2, timeoutMs: 1000 }));
    expect(tokens).toEqual(["Điện", " toán"]);
    expect(calls[0].body).toEqual({
      model: "qwen2.5:3b",
      keep_alive: "30m",
      stream: true,
      options: { temperature: 0.2, num_predict: 512 },
      messages: [
        { role: "system", content: BASE.system },
        { role: "user", content: BASE.user },
      ],
    });
  });

  test("no first token in time is PROVIDER_TIMEOUT", async () => {
    const ollama = createOllama(config(), {
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))),
    });
    await expect(collect(ollama.stream({ ...BASE, timeoutMs: 20 }))).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
  });

  test("an error line from Ollama is PROVIDER_ERROR", async () => {
    const ollama = createOllama(config(), {
      fetchImpl: async () => streamingResponse(['{"error":"model not loaded"}\n']),
    });
    await expect(collect(ollama.stream({ ...BASE, timeoutMs: 1000 }))).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      message: "Ollama failed: model not loaded",
    });
  });
});

describe("OpenAI provider chat", () => {
  test("streams Chat Completions SSE like the backend did", async () => {
    const calls = [];
    const openai = createOpenAI(config(), {
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
        return streamingResponse([
          'data: {"choices":[{"delta":{"content":"Cloud"}}]}\n\n',
          'data: {"choices":[{"delta":{}}]}\n\ndata: {"choices":[{"delta":{"content":" là"}}]}\n\n',
          "data: [DONE]\n\n",
        ]);
      },
    });
    const tokens = await collect(openai.stream({ ...BASE, maxTokens: 700, temperature: 0.2, timeoutMs: 1000 }));
    expect(tokens).toEqual(["Cloud", " là"]);
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(calls[0].auth).toBe("Bearer sk-test");
    expect(calls[0].body).toMatchObject({ model: "gpt-4.1-mini", max_completion_tokens: 700, temperature: 0.2, stream: true });
  });

  test("chat() returns the whole answer", async () => {
    const openai = createOpenAI(config(), {
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "Xin chào" } }] }) }),
    });
    await expect(openai.chat({ ...BASE, timeoutMs: 1000 })).resolves.toEqual({ model: "gpt-4.1-mini", content: "Xin chào" });
  });

  test("an HTTP error and a missing key are provider errors", async () => {
    const failing = createOpenAI(config(), {
      fetchImpl: async () => ({ ok: false, status: 429, text: async () => "rate limit" }),
    });
    await expect(collect(failing.stream({ ...BASE, timeoutMs: 1000 }))).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
    const keyless = createOpenAI(config({ OPENAI_API_KEY: "" }));
    await expect(keyless.chat({ ...BASE, timeoutMs: 1000 })).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
  });
});
