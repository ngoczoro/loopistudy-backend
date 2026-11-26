import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import { createOllama, parseJsonObject } from "../src/providers/ollama.js";
import { createOpenAI } from "../src/providers/openai.js";
import { createStatus } from "../src/status.js";

const KEY = "test-key";
const BASE = { system: "Bạn viết câu hỏi.", user: "Đoạn ghi chú: ..." };

const ollamaReplying = (content, { status = 200 } = {}) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), signal: init.signal });
    return {
      ok: status === 200,
      status,
      text: async () => "model not found",
      json: async () => ({ message: { content } }),
    };
  };
  return { fetchImpl, calls };
};

const openaiReplying = (respond) => {
  const calls = [];
  const createClient = () => ({
    responses: {
      create: async (params, options) => {
        calls.push({ params, options });
        return respond(params, calls.length);
      },
    },
  });
  return { createClient, calls };
};

const build = ({ env = {}, ollama = ollamaReplying('{"question":"Vì sao?"}'), openai } = {}) => {
  const config = loadConfig({ AI_SERVICE_KEY: KEY, LOG_LEVEL: "silent", OPENAI_API_KEY: "sk-test", ...env });
  const logger = createLogger("silent");
  const status = createStatus(config, { fetchImpl: async () => ({ ok: true }) });
  const providers = {
    ollama: createOllama(config, { fetchImpl: ollama.fetchImpl }),
    openai: createOpenAI(config, {
      createClient: (openai ?? openaiReplying(() => ({ output_text: '{"question":"Why?"}' }))).createClient,
    }),
  };
  const app = createApp({ config, logger, status, providers });
  return (body) => request(app).post("/v1/llm/json").set("x-internal-key", KEY).send(body);
};

describe("POST /v1/llm/json with Ollama", () => {
  test("sends the backend's request and returns the parsed JSON", async () => {
    const ollama = ollamaReplying('Sure: {"question":"Vì sao?"} done');
    const post = build({ ollama });
    const schema = { type: "object", properties: { question: { type: "string" } } };
    const response = await post({ provider: "ollama", ...BASE, schema, maxTokens: 400, temperature: 0.4 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      provider: "ollama",
      model: "qwen2.5:3b",
      json: { question: "Vì sao?" },
    });
    expect(typeof response.body.durationMs).toBe("number");
    expect(ollama.calls[0].url).toBe("http://127.0.0.1:11434/api/chat");
    expect(ollama.calls[0].body).toEqual({
      model: "qwen2.5:3b",
      stream: false,
      keep_alive: "30m",
      format: schema,
      options: { temperature: 0.4, num_predict: 400 },
      messages: [
        { role: "system", content: BASE.system },
        { role: "user", content: BASE.user },
      ],
    });
  });

  test('uses format "json" without a schema', async () => {
    const ollama = ollamaReplying('{"a":1}');
    await build({ ollama })({ provider: "ollama", ...BASE });
    expect(ollama.calls[0].body.format).toBe("json");
    expect(ollama.calls[0].body.options).toEqual({ temperature: 0.4, num_predict: 800 });
  });

  test("a reply without JSON is INVALID_MODEL_OUTPUT", async () => {
    const response = await build({ ollama: ollamaReplying("[5]") })({ provider: "ollama", ...BASE });
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("INVALID_MODEL_OUTPUT");
  });

  test("an Ollama HTTP error is PROVIDER_ERROR", async () => {
    const response = await build({ ollama: ollamaReplying("", { status: 404 }) })({ provider: "ollama", ...BASE });
    expect(response.status).toBe(502);
    expect(response.body.error).toMatchObject({ code: "PROVIDER_ERROR" });
    expect(response.body.error.message).toMatch(/HTTP 404/);
  });

  test("a slow Ollama is PROVIDER_TIMEOUT", async () => {
    const slow = {
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    };
    const response = await build({ ollama: slow })({ provider: "ollama", ...BASE, timeoutMs: 30 });
    expect(response.status).toBe(504);
    expect(response.body.error.code).toBe("PROVIDER_TIMEOUT");
  });

  test("an empty OLLAMA_URL is PROVIDER_NOT_CONFIGURED", async () => {
    const response = await build({ env: { OLLAMA_URL: "" } })({ provider: "ollama", ...BASE });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });

  test("never falls back to OpenAI by itself", async () => {
    const openai = openaiReplying(() => ({ output_text: '{"q":1}' }));
    const response = await build({ ollama: ollamaReplying("no json"), openai })({ provider: "ollama", ...BASE });
    expect(response.status).toBe(502);
    expect(openai.calls).toHaveLength(0);
  });
});

describe("POST /v1/llm/json with OpenAI", () => {
  test("uses json_object mode like the backend's generateJson", async () => {
    const openai = openaiReplying(() => ({ output_text: '```json\n{"question":"Why?"}\n```' }));
    const response = await build({ openai })({ provider: "openai", ...BASE, maxTokens: 500, temperature: 0.4 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ provider: "openai", model: "gpt-4.1-mini", json: { question: "Why?" } });
    const { params, options } = openai.calls[0];
    expect(params).toMatchObject({
      model: "gpt-4.1-mini",
      instructions: BASE.system,
      temperature: 0.4,
      max_output_tokens: 500,
      text: { format: { type: "json_object" } },
    });
    expect(params.input).toMatch(/Respond with a valid JSON object only/);
    expect(options.maxRetries).toBe(0);
  });

  test("retries without json_object when the model rejects that format", async () => {
    const openai = openaiReplying((_params, n) => {
      if (n === 1) throw Object.assign(new Error("text.format json_object not supported"), { status: 400 });
      return { output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }] };
    });
    const response = await build({ openai })({ provider: "openai", ...BASE });
    expect(response.status).toBe(200);
    expect(response.body.json).toEqual({ ok: true });
    expect(openai.calls[1].params.text).toBeUndefined();
    expect(openai.calls[1].params.instructions).toMatch(/Return ONLY a valid JSON object/);
  });

  test("cuts the input to 32000 characters", async () => {
    const openai = openaiReplying(() => ({ output_text: "{}" }));
    await build({ openai })({ provider: "openai", system: "json", user: "x".repeat(40_000) });
    expect(openai.calls[0].params.input.startsWith("x".repeat(32_000))).toBe(true);
    expect(openai.calls[0].params.input).not.toContain("x".repeat(32_001));
  });

  test("no API key is PROVIDER_NOT_CONFIGURED", async () => {
    const response = await build({ env: { OPENAI_API_KEY: "" } })({ provider: "openai", ...BASE });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });

  test("an OpenAI error is PROVIDER_ERROR; prose is INVALID_MODEL_OUTPUT", async () => {
    const failing = openaiReplying(() => {
      throw Object.assign(new Error("Rate limit"), { status: 429 });
    });
    const error = await build({ openai: failing })({ provider: "openai", ...BASE });
    expect(error.status).toBe(502);
    expect(error.body.error.code).toBe("PROVIDER_ERROR");

    const prose = openaiReplying(() => ({ output_text: "I cannot help with that." }));
    const invalid = await build({ openai: prose })({ provider: "openai", ...BASE });
    expect(invalid.body.error.code).toBe("INVALID_MODEL_OUTPUT");
  });
});

describe("request checks", () => {
  test.each([
    [{ ...BASE }, /provider/],
    [{ ...BASE, provider: "gemini" }, /provider/],
    [{ provider: "ollama", user: "u" }, /system/],
    [{ provider: "ollama", system: "s", user: "  " }, /user/],
    [{ provider: "ollama", ...BASE, schema: [] }, /schema/],
    [{ provider: "ollama", ...BASE, maxTokens: 0 }, /maxTokens/],
    [{ provider: "ollama", ...BASE, maxTokens: 1.5 }, /maxTokens/],
    [{ provider: "ollama", ...BASE, temperature: 3 }, /temperature/],
    [{ provider: "ollama", ...BASE, timeoutMs: 200_000 }, /timeoutMs/],
  ])("rejects %j", async (body, message) => {
    const response = await build()(body);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(message);
  });
});

test("parseJsonObject takes the first {...} block", () => {
  expect(parseJsonObject('text {"a":{"b":1}} more')).toEqual({ a: { b: 1 } });
  expect(parseJsonObject("[1,2]")).toBeNull();
  expect(parseJsonObject("{broken")).toBeNull();
});
