import { AiServiceError, createAiServiceClient } from "./aiServiceClient.js";

const URL = "http://ai:5100";

const jsonResponse = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
});

const setup = ({ env = {}, answer } = {}) => {
  let time = 1_000_000;
  const calls = [];
  const client = createAiServiceClient({
    env: { AI_SERVICE_URL: URL, AI_SERVICE_KEY: "k", ...env },
    now: () => time,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return answer(calls.length, init);
    },
  });
  return { client, calls, advance: (ms) => (time += ms) };
};

describe("aiServiceClient", () => {
  test("is disabled without AI_SERVICE_URL", async () => {
    const client = createAiServiceClient({ env: {} });
    expect(client.enabled()).toBe(false);
    await expect(client.post("/v1/embed", {})).rejects.toMatchObject({ code: "AI_SERVICE_DISABLED" });
  });

  test("posts JSON with the internal key, a request id and the priority", async () => {
    const { client, calls } = setup({ answer: () => jsonResponse(200, { ok: 1 }) });
    await expect(client.post("/v1/embed", { texts: ["a"] }, { priority: "chat" })).resolves.toEqual({
      ok: 1,
    });
    expect(calls[0].url).toBe(`${URL}/v1/embed`);
    expect(calls[0].init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-internal-key": "k",
      "x-priority": "chat",
    });
    expect(calls[0].init.headers["x-request-id"]).toBeTruthy();
    expect(JSON.parse(calls[0].init.body)).toEqual({ texts: ["a"] });
  });

  test("turns the service's error body into AiServiceError", async () => {
    const { client } = setup({
      answer: () =>
        jsonResponse(503, { error: { code: "QUEUE_FULL", message: "busy" } }, { "retry-after": "5" }),
    });
    const error = await client.post("/v1/llm/json", {}).catch((e) => e);
    expect(error).toBeInstanceOf(AiServiceError);
    expect(error).toMatchObject({ status: 503, code: "QUEUE_FULL", message: "busy", retryAfterSec: 5 });
  });

  test("times out", async () => {
    const { client } = setup({
      env: { AI_SERVICE_TIMEOUT_MS: "20" },
      answer: (_n, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    await expect(client.post("/v1/embed", {})).rejects.toMatchObject({ code: "AI_SERVICE_TIMEOUT" });
  });

  test("a cancelled caller is not counted as a service failure", async () => {
    const { client } = setup({
      answer: (_n, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    for (let i = 0; i < 3; i += 1) {
      const controller = new AbortController();
      const pending = client.post("/v1/embed", {}, { signal: controller.signal });
      controller.abort();
      await expect(pending).rejects.toThrow();
    }
    expect(client.circuitState()).toBe("closed");
  });

  describe("circuit breaker", () => {
    test("opens after 3 failures in a row and fails fast without calling", async () => {
      const { client, calls } = setup({
        answer: () => {
          throw new Error("ECONNREFUSED");
        },
      });
      for (let i = 0; i < 3; i += 1) {
        await expect(client.post("/v1/embed", {})).rejects.toMatchObject({ code: "AI_SERVICE_UNAVAILABLE" });
      }
      expect(client.circuitState()).toBe("open");
      await expect(client.post("/v1/embed", {})).rejects.toMatchObject({ code: "AI_SERVICE_CIRCUIT_OPEN" });
      expect(calls).toHaveLength(3);
    });

    test("lets one trial through after 30 s and closes on success", async () => {
      let down = true;
      const { client, calls, advance } = setup({
        answer: () => {
          if (down) throw new Error("ECONNREFUSED");
          return jsonResponse(200, {});
        },
      });
      for (let i = 0; i < 3; i += 1) await client.post("/v1/embed", {}).catch(() => {});
      advance(30_000);
      down = false;
      await expect(client.post("/v1/embed", {})).resolves.toEqual({});
      expect(client.circuitState()).toBe("closed");
      expect(calls).toHaveLength(4);
    });

    test("a failed trial opens it again", async () => {
      const { client, advance } = setup({
        answer: () => {
          throw new Error("ECONNREFUSED");
        },
      });
      for (let i = 0; i < 3; i += 1) await client.post("/v1/embed", {}).catch(() => {});
      advance(30_000);
      await client.post("/v1/embed", {}).catch(() => {});
      expect(client.circuitState()).toBe("open");
    });

    test("errors the service reports about the request, a provider or itself being busy do not count", async () => {
      const answers = [
        jsonResponse(400, { error: { code: "INVALID_REQUEST", message: "bad" } }),
        jsonResponse(503, { error: { code: "QUEUE_FULL", message: "busy" } }),
        jsonResponse(502, { error: { code: "PROVIDER_ERROR", message: "Ollama failed" } }),
        jsonResponse(504, { error: { code: "PROVIDER_TIMEOUT", message: "slow" } }),
        jsonResponse(502, { error: { code: "INVALID_MODEL_OUTPUT", message: "no JSON" } }),
        jsonResponse(503, { error: { code: "PROVIDER_NOT_CONFIGURED", message: "off" } }),
        jsonResponse(503, { error: { code: "MODEL_NOT_READY", message: "loading" } }),
      ];
      const { client } = setup({ answer: (n) => answers[n - 1] });
      for (let i = 0; i < answers.length; i += 1) await client.post("/v1/llm/json", {}).catch(() => {});
      expect(client.circuitState()).toBe("closed");
    });

    test.each([
      ["INTERNAL", jsonResponse(500, { error: { code: "INTERNAL" } })],
      ["a 5xx without a body (a proxy)", jsonResponse(502, null)],
      ["a wrong key", jsonResponse(401, { error: { code: "UNAUTHORIZED" } })],
    ])("%s counts", async (_name, answer) => {
      const { client } = setup({ answer: () => answer });
      for (let i = 0; i < 3; i += 1) await client.post("/v1/embed", {}).catch(() => {});
      expect(client.circuitState()).toBe("open");
    });

    test("a success resets the failure count", async () => {
      const answers = [false, false, true, false, false];
      const { client } = setup({
        answer: (n) => {
          if (!answers[n - 1]) throw new Error("ECONNREFUSED");
          return jsonResponse(200, {});
        },
      });
      for (let i = 0; i < 5; i += 1) await client.post("/v1/embed", {}).catch(() => {});
      expect(client.circuitState()).toBe("closed");
    });
  });
});
