import { ServiceError } from "../errors.js";
import {
  callSignal,
  invalidModelOutput,
  providerError,
  providerNotConfigured,
  providerTimeout,
} from "./errors.js";
import { firstTokenSignal, readLines } from "./stream.js";

/** The first {...} block of the reply, parsed; null when there is none (as in the backend). */
export const parseJsonObject = (raw) => {
  const text = String(raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

/**
 * Ollama /api/chat, with the requests the backend used to send itself:
 *   json()   quiz/flashcard JSON (study-material/ollama.js)
 *   chat()   an Ask AI answer in one piece (assistant.llm.js generateWithOllama)
 *   stream() an Ask AI answer token by token (assistant.llm.js streamWithOllama)
 * All send keep_alive so the model stays loaded. `fetchImpl` is injectable for tests.
 */
export const createOllama = (config, { fetchImpl = (...args) => globalThis.fetch(...args) } = {}) => {
  const post = async (body, signal) => {
    if (!config.ollama.url) throw providerNotConfigured("Ollama");
    const response = await fetchImpl(`${config.ollama.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.ollama.model, keep_alive: config.ollama.keepAlive, ...body }),
      signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw providerError("Ollama", `HTTP ${response.status} ${detail.slice(0, 180)}`);
    }
    return response;
  };

  const messages = (system, user) => [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  /** One non-streamed call; maps timeouts and transport errors to provider errors. */
  const once = async ({ body, timeoutMs, signal }) => {
    const call = callSignal(timeoutMs, signal);
    try {
      const response = await post({ stream: false, ...body }, call.signal);
      return await response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      if (call.timedOut()) throw providerTimeout("Ollama", timeoutMs);
      throw providerError("Ollama", error.message);
    }
  };

  return {
    model: config.ollama.model,

    /**
     * Loads the model into memory (a generate call with no prompt) so the first real question
     * does not also pay for loading it. `{ ok, ms }`; never throws.
     */
    async warmUp({ timeoutMs = 120_000 } = {}) {
      if (!config.ollama.url) return { ok: false, ms: 0, error: "disabled" };
      const started = Date.now();
      try {
        const response = await fetchImpl(`${config.ollama.url}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: config.ollama.model, keep_alive: config.ollama.keepAlive }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        await response.text().catch(() => "");
        return { ok: response.ok, ms: Date.now() - started, error: response.ok ? null : `HTTP ${response.status}` };
      } catch (error) {
        return { ok: false, ms: Date.now() - started, error: error.message };
      }
    },

    async json({ system, user, schema, maxTokens, temperature, timeoutMs, signal }) {
      const data = await once({
        body: {
          format: schema ?? "json",
          options: { temperature, num_predict: maxTokens },
          messages: messages(system, user),
        },
        timeoutMs,
        signal,
      });
      const json = parseJsonObject(data?.message?.content);
      if (!json) throw invalidModelOutput("Ollama");
      return { model: config.ollama.model, json };
    },

    async chat({ system, user, maxTokens, temperature, timeoutMs, signal }) {
      const data = await once({
        body: { options: { temperature, num_predict: maxTokens }, messages: messages(system, user) },
        timeoutMs,
        signal,
      });
      return { model: config.ollama.model, content: String(data?.message?.content ?? "") };
    },

    /** Yields tokens. `timeoutMs` is the wait for the first one. */
    async *stream({ system, user, maxTokens, temperature, timeoutMs, signal }) {
      const watch = firstTokenSignal(timeoutMs, signal);
      try {
        const response = await post(
          { stream: true, options: { temperature, num_predict: maxTokens }, messages: messages(system, user) },
          watch.signal,
        );
        for await (const line of readLines(response.body)) {
          const data = JSON.parse(line);
          if (data.error) throw providerError("Ollama", data.error);
          const token = data.message?.content ?? "";
          if (token) {
            watch.gotToken();
            yield token;
          }
          if (data.done) break;
        }
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        if (watch.timedOut()) throw providerTimeout("Ollama", timeoutMs);
        throw providerError("Ollama", error.message);
      } finally {
        watch.stop();
      }
    },
  };
};
