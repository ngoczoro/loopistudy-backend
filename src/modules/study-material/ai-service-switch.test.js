import { jest } from "@jest/globals";
import { completeJson } from "./ollama.js";
import { completeOpenAIJson, openaiJsonAvailable } from "./openai-json.js";

// With AI_SERVICE_URL set, quiz/flashcard model calls go through POST /v1/llm/json.
describe("quiz and flashcard model calls through the AI service", () => {
  const originalFetch = globalThis.fetch;
  const saved = {};
  const ENV = ["AI_SERVICE_URL", "AI_SERVICE_KEY", "OPENAI_API_KEY"];

  beforeEach(() => {
    for (const name of ENV) saved[name] = process.env[name];
    process.env.AI_SERVICE_URL = "http://ai-test:5100";
    process.env.AI_SERVICE_KEY = "k";
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const name of ENV) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  const serviceAnswering = (answer) => {
    const requests = [];
    globalThis.fetch = jest.fn(async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body), headers: init.headers });
      const { status = 200, body } = answer(requests.at(-1).body);
      return { ok: status < 300, status, headers: { get: () => null }, json: async () => body };
    });
    return requests;
  };

  test("completeJson asks the service for Ollama with the same settings", async () => {
    const requests = serviceAnswering(() => ({
      body: { provider: "ollama", model: "qwen2.5:7b", json: { question: "Vì sao?" }, durationMs: 9 },
    }));
    const schema = { type: "object" };
    const result = await completeJson({ system: "s", user: "u", numPredict: 400, format: schema, timeoutMs: 45_000 });

    expect(result).toEqual({ model: "qwen2.5:7b", json: { question: "Vì sao?" } });
    expect(requests[0].url).toBe("http://ai-test:5100/v1/llm/json");
    expect(requests[0].body).toEqual({
      provider: "ollama",
      system: "s",
      user: "u",
      schema,
      maxTokens: 400,
      temperature: 0.4,
      timeoutMs: 45_000,
    });
    expect(requests[0].headers["x-priority"]).toBe("study");
  });

  test('format "json" is sent as no schema', async () => {
    const requests = serviceAnswering(() => ({ body: { model: "m", json: {} } }));
    await completeJson({ system: "s", user: "u" });
    expect(requests[0].body.schema).toBeNull();
    expect(requests[0].body.maxTokens).toBe(800);
  });

  test("an Ollama failure reported by the service throws, so the caller tries OpenAI", async () => {
    serviceAnswering(() => ({
      status: 504,
      body: { error: { code: "PROVIDER_TIMEOUT", message: "Ollama timed out after 45000ms" } },
    }));
    await expect(completeJson({ system: "s", user: "u" })).rejects.toThrow("Ollama timed out");
  });

  test("OpenAI goes through the service, which holds the key", async () => {
    expect(openaiJsonAvailable()).toBe(true); // no OPENAI_API_KEY in this backend
    const requests = serviceAnswering(() => ({ body: { model: "gpt-4.1-mini", json: { questions: ["Q?"] } } }));
    const result = await completeOpenAIJson({ system: "s", user: "u", maxTokens: 500 });
    expect(result).toEqual({ model: "gpt-4.1-mini", json: { questions: ["Q?"] } });
    expect(requests[0].body).toMatchObject({ provider: "openai", maxTokens: 500, temperature: 0.4 });
  });

  test("without the service, OpenAI needs a key in this backend", () => {
    delete process.env.AI_SERVICE_URL;
    expect(openaiJsonAvailable()).toBe(false);
    process.env.OPENAI_API_KEY = "sk-test";
    expect(openaiJsonAvailable()).toBe(true);
  });
});
