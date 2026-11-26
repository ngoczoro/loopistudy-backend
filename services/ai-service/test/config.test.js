import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  test("refuses to start without AI_SERVICE_KEY", () => {
    expect(() => loadConfig({})).toThrow(/AI_SERVICE_KEY is required/);
    expect(() => loadConfig({ AI_SERVICE_KEY: "   " })).toThrow(/AI_SERVICE_KEY is required/);
  });

  test("uses the defaults from API.md", () => {
    const config = loadConfig({ AI_SERVICE_KEY: "k" });
    expect(config.port).toBe(5100);
    expect(config.embedding).toEqual({
      model: "Xenova/multilingual-e5-small",
      cacheDir: "./.hf-cache",
      preload: true,
    });
    expect(config.ollama).toEqual({
      url: "http://127.0.0.1:11434",
      model: "qwen2.5:3b",
      keepAlive: "30m",
      concurrency: 1,
      maxQueue: 3,
      warmUp: true,
    });
    expect(config.openai).toEqual({ apiKey: "", model: "gpt-4.1-mini" });
  });

  test("an empty OLLAMA_URL turns Ollama off; a trailing slash is dropped", () => {
    expect(loadConfig({ AI_SERVICE_KEY: "k", OLLAMA_URL: "" }).ollama.url).toBe("");
    expect(loadConfig({ AI_SERVICE_KEY: "k", OLLAMA_URL: "http://ollama:11434/" }).ollama.url).toBe(
      "http://ollama:11434",
    );
  });

  test("rejects numbers that are not numbers", () => {
    expect(() => loadConfig({ AI_SERVICE_KEY: "k", PORT: "abc" })).toThrow(/PORT/);
    expect(() => loadConfig({ AI_SERVICE_KEY: "k", OLLAMA_MAX_QUEUE: "-1" })).toThrow(
      /OLLAMA_MAX_QUEUE/,
    );
  });

  test("EMBEDDING_PRELOAD=false turns preloading off", () => {
    expect(loadConfig({ AI_SERVICE_KEY: "k", EMBEDDING_PRELOAD: "false" }).embedding.preload).toBe(
      false,
    );
  });
});
