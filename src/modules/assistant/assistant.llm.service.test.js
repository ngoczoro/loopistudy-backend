import { jest } from "@jest/globals";
import { generateRagAnswer, streamRagAnswer } from "./assistant.llm.js";

// With AI_SERVICE_URL set, Ask AI's model calls go through the AI service; the order
// (Ollama → OpenAI → extractive), resets and refusal checks still run here.
const HITS = [
  { index: 1, documentTitle: "Cloud", location: "Slide 3", excerpt: "Cloud computing: store, manage and access data online." },
];
const QUESTION = "Cloud computing là gì?";

const sse = (events) =>
  events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");

const streamBody = (text) =>
  (async function* () {
    // Split mid-event to check the parser joins chunks.
    const bytes = new TextEncoder().encode(text);
    const middle = Math.floor(bytes.length / 2);
    yield bytes.slice(0, middle);
    yield bytes.slice(middle);
  })();

/** Fake service: `answers[provider]` is { stream: [...events] } or { status, error }. */
const serviceWith = (answers) => {
  const requests = [];
  globalThis.fetch = jest.fn(async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push({ url, body, headers: init.headers });
    const answer = answers[body.provider];
    if (answer.error) {
      return {
        ok: false,
        status: answer.status,
        headers: { get: () => null },
        json: async () => ({ error: answer.error }),
      };
    }
    if (url.endsWith("/v1/llm/chat")) {
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => answer.chat };
    }
    return { ok: true, status: 200, headers: { get: () => null }, body: streamBody(sse(answer.stream)) };
  });
  return requests;
};

const run = async () => {
  const events = [];
  const result = await streamRagAnswer({
    question: QUESTION,
    hits: HITS,
    onToken: (text) => events.push(["token", text]),
    onReset: () => events.push(["reset"]),
    onProvider: (source) => events.push(["provider", { ...source }]),
  });
  return { result, events };
};

describe("Ask AI through the AI service", () => {
  const originalFetch = globalThis.fetch;
  const saved = {};
  const ENV = ["AI_SERVICE_URL", "AI_SERVICE_KEY", "OLLAMA_URL"];

  beforeEach(() => {
    for (const name of ENV) saved[name] = process.env[name];
    process.env.AI_SERVICE_URL = "http://ai-test:5100";
    process.env.AI_SERVICE_KEY = "k";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const name of ENV) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  test("streams Ollama's answer and names the model the service runs", async () => {
    const requests = serviceWith({
      ollama: {
        stream: [
          ["start", { provider: "ollama", model: "qwen2.5:7b" }],
          ["token", { text: "Cloud computing là lưu trữ, " }],
          ["token", { text: "quản lý dữ liệu trực tuyến [1]." }],
          ["done", { tokens: 2 }],
        ],
      },
    });
    const { result, events } = await run();

    expect(result).toMatchObject({ provider: "ollama", model: "qwen2.5:7b" });
    expect(result.content).toBe("Cloud computing là lưu trữ, quản lý dữ liệu trực tuyến [1].");
    expect(events[0]).toEqual(["provider", { provider: "ollama", model: "qwen2.5:7b" }]);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("http://ai-test:5100/v1/llm/chat/stream");
    expect(requests[0].headers["x-priority"]).toBe("chat");
    expect(requests[0].body).toMatchObject({ provider: "ollama", maxTokens: 512, temperature: 0.2 });
    expect(requests[0].body.user).toContain(QUESTION);
    expect(requests[0].body.user).toContain("store, manage and access data online");
  });

  test("asks for Ollama through the service even when this backend has no OLLAMA_URL", async () => {
    process.env.OLLAMA_URL = "";
    const requests = serviceWith({
      ollama: { stream: [["start", { model: "m" }], ["token", { text: "Một câu trả lời đủ dài [1]." }], ["done", {}]] },
    });
    await run();
    expect(requests[0].body.provider).toBe("ollama");
  });

  test("Ollama timing out before any token goes straight to OpenAI, with no reset", async () => {
    serviceWith({
      ollama: { status: 504, error: { code: "PROVIDER_TIMEOUT", message: "Ollama timed out after 60000ms" } },
      openai: {
        stream: [
          ["start", { provider: "openai", model: "gpt-4.1-mini" }],
          ["token", { text: "Cloud computing là lưu trữ dữ liệu trực tuyến [1]." }],
          ["done", {}],
        ],
      },
    });
    const { result, events } = await run();
    expect(result).toMatchObject({ provider: "openai", model: "gpt-4.1-mini" });
    expect(result.errors).toEqual(["ollama: Ollama timed out after 60000ms"]);
    expect(events.some(([name]) => name === "reset")).toBe(false);
  });

  test("an error event mid-answer resets the shown text, then OpenAI answers", async () => {
    serviceWith({
      ollama: {
        stream: [
          ["start", { model: "qwen2.5:3b" }],
          ["token", { text: "Cloud comp" }],
          ["error", { code: "PROVIDER_ERROR", message: "Ollama failed: connection reset" }],
        ],
      },
      openai: { stream: [["start", { model: "gpt-4.1-mini" }], ["token", { text: "Đây là câu trả lời đầy đủ [1]." }], ["done", {}]] },
    });
    const { result, events } = await run();
    expect(events.map(([name]) => name)).toEqual(["provider", "token", "reset", "provider", "token"]);
    expect(result.provider).toBe("openai");
    expect(result.errors[0]).toMatch(/Ollama: Ollama failed: connection reset/);
  });

  test("a refusal is still caught here and the passages are not pasted", async () => {
    serviceWith({
      ollama: { stream: [["start", {}], ["token", { text: "Tài liệu không có thông tin này." }], ["done", {}]] },
      openai: { stream: [["start", {}], ["token", { text: "Không tìm thấy thông tin trong tài liệu." }], ["done", {}]] },
    });
    const { result } = await run();
    expect(result.refused).toBe(true);
  });

  test("both providers failing falls back to the extractive answer", async () => {
    serviceWith({
      ollama: { status: 503, error: { code: "PROVIDER_NOT_CONFIGURED", message: "Ollama is not configured on the AI service" } },
      openai: { status: 503, error: { code: "PROVIDER_NOT_CONFIGURED", message: "OpenAI is not configured on the AI service" } },
    });
    const { result, events } = await run();
    expect(result.provider).toBe("extractive");
    expect(events[0]).toEqual(["provider", { provider: "extractive", model: null }]);
  });

  test("the non-streamed answer uses POST /v1/llm/chat", async () => {
    const requests = serviceWith({
      ollama: { chat: { provider: "ollama", model: "qwen2.5:3b", content: "Cloud computing là lưu trữ trực tuyến [1]." } },
    });
    const result = await generateRagAnswer({ question: QUESTION, hits: HITS });
    expect(result).toMatchObject({ provider: "ollama", model: "qwen2.5:3b" });
    expect(requests[0].url).toBe("http://ai-test:5100/v1/llm/chat");
  });
});
