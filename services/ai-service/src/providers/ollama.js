import { ServiceError } from "../errors.js";
import {
  callSignal,
  invalidModelOutput,
  providerError,
  providerNotConfigured,
  providerTimeout,
} from "./errors.js";

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
 * Ollama /api/chat without streaming. Same request the backend's study-material/ollama.js sent,
 * plus keep_alive so the model stays loaded between quiz questions.
 * `fetchImpl` is injectable for tests.
 */
export const createOllama = (config, { fetchImpl = (...args) => globalThis.fetch(...args) } = {}) => ({
  model: config.ollama.model,

  async json({ system, user, schema, maxTokens, temperature, timeoutMs, signal }) {
    if (!config.ollama.url) throw providerNotConfigured("Ollama");
    const call = callSignal(timeoutMs, signal);

    try {
      const response = await fetchImpl(`${config.ollama.url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.ollama.model,
          stream: false,
          keep_alive: config.ollama.keepAlive,
          format: schema ?? "json",
          options: { temperature, num_predict: maxTokens },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: call.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw providerError("Ollama", `HTTP ${response.status} ${detail.slice(0, 180)}`);
      }
      const data = await response.json();
      const json = parseJsonObject(data?.message?.content);
      if (!json) throw invalidModelOutput("Ollama");
      return { model: config.ollama.model, json };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      if (call.timedOut()) throw providerTimeout("Ollama", timeoutMs);
      throw providerError("Ollama", error.message);
    }
  },
});
