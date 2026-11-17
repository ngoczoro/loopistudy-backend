const DEFAULT_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 60_000);

const resolveBaseUrl = () => {
  const raw = String(process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").trim();
  return raw.replace(/\/$/, "");
};

export const ollamaModelName = () => process.env.OLLAMA_MODEL || "qwen2.5:3b";

const parseJsonObject = (raw) => {
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
 * Local Ollama JSON completion. Throws when the server is missing or too slow.
 * `format` may be a JSON schema object to make small models return exactly that shape.
 */
export const completeJson = async ({
  system,
  user,
  numPredict = 800,
  format = "json",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) throw new Error("OLLAMA_URL is not configured");

  const model = ollamaModelName();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format,
        options: { temperature: 0.4, num_predict: numPredict },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${detail.slice(0, 180)}`);
    }

    const data = await response.json();
    const parsed = parseJsonObject(data?.message?.content);
    if (!parsed) throw new Error("Ollama returned no JSON");
    return { model, json: parsed };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Ollama timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};
