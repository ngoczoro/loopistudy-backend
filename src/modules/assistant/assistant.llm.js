import {
  OLLAMA_FIRST_TOKEN_TIMEOUT_MS,
  OLLAMA_KEEP_ALIVE,
  OLLAMA_MODEL,
  OLLAMA_TIMEOUT_MS,
  OLLAMA_URL,
  OPENAI_ASSISTANT_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
} from "./assistant.constants.js";
import {
  buildOllamaSystemPrompt,
  buildOllamaUserPrompt,
  buildRagSystemPrompt,
  buildRagUserPrompt,
  looksLikeNotFoundRefusal,
  sanitizeCitationMarkers,
  stripAnswerPrefix,
  visibleAnswerText,
} from "./assistant.prompt.js";
import { buildExtractiveAnswer } from "./assistant.retrieve.js";
import { getOpenAIConfig } from "../ai/ai.constants.js";

const withTimeout = async (promiseFactory, timeoutMs, label) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promiseFactory(controller.signal);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const resolveOllamaBaseUrl = () => {
  const raw = String(OLLAMA_URL || "").trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
};

export const generateWithOllama = async ({ question, hits }) => {
  const baseUrl = resolveOllamaBaseUrl();
  if (!baseUrl) throw new Error("OLLAMA_URL is not configured");

  const body = {
    model: OLLAMA_MODEL,
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      temperature: 0.2,
      num_predict: 512,
    },
    messages: [
      { role: "system", content: buildOllamaSystemPrompt() },
      {
        role: "user",
        content: buildOllamaUserPrompt({ question, hits }),
      },
    ],
  };

  const data = await withTimeout(
    async (signal) => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Ollama HTTP ${response.status}: ${detail.slice(0, 200)}`,
        );
      }
      return response.json();
    },
    OLLAMA_TIMEOUT_MS,
    "Ollama",
  );

  const text = String(data?.message?.content ?? "").trim();
  if (!text) throw new Error("Ollama returned an empty answer");
  return text;
};

export const generateWithOpenAI = async ({ question, hits }) => {
  const { apiKey, model } = getOpenAIConfig();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const body = {
    model: model || "gpt-4.1-mini",
    temperature: 0.2,
    max_completion_tokens: 700,
    messages: [
      { role: "system", content: buildRagSystemPrompt() },
      {
        role: "user",
        content: buildRagUserPrompt({ question, hits }),
      },
    ],
  };

  const data = await withTimeout(
    async (signal) => {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal,
        },
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `OpenAI HTTP ${response.status}: ${detail.slice(0, 200)}`,
        );
      }
      return response.json();
    },
    OPENAI_ASSISTANT_TIMEOUT_MS,
    "OpenAI",
  );

  const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("OpenAI returned an empty answer");
  return text;
};

/* ---------- Streaming ---------- */

/** Yield complete lines from a fetch body (Ollama NDJSON, OpenAI SSE). */
async function* readLines(body) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield line;
    }
  }
  const rest = buffer.trim();
  if (rest) yield rest;
}

/**
 * Abort when no token arrives in time: a long wait for the first one (CPU Ollama must read
 * the whole RAG prompt first) and a shorter wait between later tokens.
 * Also follows `outerSignal` (the client closed the page).
 */
const createTokenWatchdog = ({ firstTokenMs, idleMs, outerSignal, label }) => {
  const controller = new AbortController();
  let reason = null;
  let timer = null;
  const arm = (ms, why) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      reason = why;
      controller.abort();
    }, ms);
  };
  const onOuterAbort = () => {
    reason = "client";
    controller.abort();
  };
  if (outerSignal?.aborted) onOuterAbort();
  outerSignal?.addEventListener("abort", onOuterAbort, { once: true });
  arm(firstTokenMs, `${label} sent no token within ${firstTokenMs}ms`);

  return {
    signal: controller.signal,
    tokenReceived: () => arm(idleMs, `${label} stalled for ${idleMs}ms`),
    stop: () => {
      clearTimeout(timer);
      outerSignal?.removeEventListener("abort", onOuterAbort);
    },
    toError: (error) => {
      if (error?.name !== "AbortError") return error;
      if (reason === "client") return Object.assign(new Error("Client disconnected"), { clientAborted: true });
      return new Error(reason || `${label} aborted`);
    },
  };
};

export const streamWithOllama = async ({ question, hits, onToken, signal }) => {
  const baseUrl = resolveOllamaBaseUrl();
  if (!baseUrl) throw new Error("OLLAMA_URL is not configured");

  const watchdog = createTokenWatchdog({
    firstTokenMs: OLLAMA_FIRST_TOKEN_TIMEOUT_MS,
    idleMs: STREAM_IDLE_TIMEOUT_MS,
    outerSignal: signal,
    label: "Ollama",
  });
  let text = "";
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: { temperature: 0.2, num_predict: 512 },
        messages: [
          { role: "system", content: buildOllamaSystemPrompt() },
          { role: "user", content: buildOllamaUserPrompt({ question, hits }) },
        ],
      }),
      signal: watchdog.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }

    for await (const line of readLines(response.body)) {
      const data = JSON.parse(line);
      if (data.error) throw new Error(`Ollama: ${data.error}`);
      const token = data.message?.content ?? "";
      if (token) {
        watchdog.tokenReceived();
        text += token;
        onToken(token);
      }
      if (data.done) break;
    }
  } catch (error) {
    throw Object.assign(watchdog.toError(error), { emitted: text.length > 0 });
  } finally {
    watchdog.stop();
  }

  if (!text.trim()) throw new Error("Ollama returned an empty answer");
  return text.trim();
};

export const streamWithOpenAI = async ({ question, hits, onToken, signal }) => {
  const { apiKey, model } = getOpenAIConfig();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const watchdog = createTokenWatchdog({
    firstTokenMs: OPENAI_ASSISTANT_TIMEOUT_MS,
    idleMs: STREAM_IDLE_TIMEOUT_MS,
    outerSignal: signal,
    label: "OpenAI",
  });
  let text = "";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4.1-mini",
        temperature: 0.2,
        max_completion_tokens: 700,
        stream: true,
        messages: [
          { role: "system", content: buildRagSystemPrompt() },
          { role: "user", content: buildRagUserPrompt({ question, hits }) },
        ],
      }),
      signal: watchdog.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }

    for await (const line of readLines(response.body)) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") break;
      const token = JSON.parse(payload).choices?.[0]?.delta?.content ?? "";
      if (token) {
        watchdog.tokenReceived();
        text += token;
        onToken(token);
      }
    }
  } catch (error) {
    throw Object.assign(watchdog.toError(error), { emitted: text.length > 0 });
  } finally {
    watchdog.stop();
  }

  if (!text.trim()) throw new Error("OpenAI returned an empty answer");
  return text.trim();
};

/**
 * Try Ollama → OpenAI → extractive passages.
 * @returns {{ content: string, provider: string, errors?: string[] }}
 */
const REFUSED_SUFFIX = ": refused despite retrieved passages";

const EMPTY_ANSWER = ": no usable text (empty or citation numbers only)";
/** Fewer visible characters than this is not an answer (e.g. "[5]" or "Có."). */
const MIN_ANSWER_CHARS = 8;

/**
 * Clean a model reply and decide whether to show it.
 * `{ content }` to keep; `{ failure }` (an errors suffix) to try the next tier.
 * Only REFUSED_SUFFIX counts as "the passages do not answer this" in fallbackAfterAllTiers;
 * an empty reply is just a failed attempt.
 */
const acceptGeneratedAnswer = (raw, hits) => {
  const content = sanitizeCitationMarkers(stripAnswerPrefix(raw), hits.length);
  if (visibleAnswerText(content).length < MIN_ANSWER_CHARS) return { failure: EMPTY_ANSWER };
  if (hits.length > 0 && looksLikeNotFoundRefusal(content)) return { failure: REFUSED_SUFFIX };
  return { content };
};

/**
 * What to return when no tier produced an answer.
 * A model that read the passages and still refused means they do not answer the question
 * (retrieval matched on noise), so report not found instead of pasting unrelated excerpts.
 * Only when no model could run at all are the raw excerpts the best we have.
 */
const fallbackAfterAllTiers = (errors, hits) => {
  if (errors.some((error) => error.endsWith(REFUSED_SUFFIX))) {
    return { refused: true, content: null, provider: "none", errors };
  }
  return { content: buildExtractiveAnswer(hits), provider: "extractive", errors };
};

export const generateRagAnswer = async ({ question, hits }) => {
  const errors = [];

  if (resolveOllamaBaseUrl()) {
    try {
      const raw = await generateWithOllama({ question, hits });
      const { content, failure } = acceptGeneratedAnswer(raw, hits);
      if (content) {
        return { content, provider: "ollama", model: OLLAMA_MODEL };
      }
      errors.push(`ollama${failure}`);
      console.warn(`⚠ Ollama${failure}; trying next tier`);
    } catch (error) {
      errors.push(`ollama: ${error.message}`);
      console.warn("⚠ Ollama answer failed:", error.message);
    }
  } else {
    errors.push("ollama: OLLAMA_URL empty");
  }

  try {
    const raw = await generateWithOpenAI({ question, hits });
    const { content, failure } = acceptGeneratedAnswer(raw, hits);
    if (content) {
      return {
        content,
        provider: "openai",
        model: getOpenAIConfig().model,

        errors: errors.length ? errors : null,
      };
    }
    errors.push(`openai${failure}`);
    console.warn(`⚠ OpenAI${failure}`);
  } catch (error) {
    errors.push(`openai: ${error.message}`);
    console.warn("⚠ OpenAI answer failed:", error.message);
  }

  return fallbackAfterAllTiers(errors, hits);
};

/**
 * Streaming version of generateRagAnswer: Ollama → OpenAI → extractive, tokens sent to `onToken`.
 * Returns `{ refused: true }` (nothing emitted) when the models found no answer in the passages.
 * If a tier fails or refuses after it already streamed text, `onReset` tells the client to
 * clear that text before the next tier starts. The returned content is the sanitized answer.
 * `onProvider({ provider, model })` fires with the first token of each tier that streams,
 * so the client can show which model is answering (again after a reset).
 * Throws `{ clientAborted: true }` when the client went away (nothing to save).
 */
export const streamRagAnswer = async ({
  question,
  hits,
  onToken,
  onReset,
  onProvider = () => {},
  signal,
}) => {
  const errors = [];
  let shown = false;
  const emitFrom = (source) => (token) => {
    if (!shown) onProvider(source);
    shown = true;
    onToken(token);
  };
  const resetIfShown = () => {
    if (shown) onReset();
    shown = false;
  };

  const tiers = [];
  if (resolveOllamaBaseUrl()) {
    tiers.push({ provider: "ollama", model: OLLAMA_MODEL, run: streamWithOllama });
  } else {
    errors.push("ollama: OLLAMA_URL empty");
  }
  tiers.push({ provider: "openai", model: getOpenAIConfig().model, run: streamWithOpenAI });

  for (const tier of tiers) {
    try {
      const emit = emitFrom({ provider: tier.provider, model: tier.model });
      const raw = await tier.run({ question, hits, onToken: emit, signal });
      const { content, failure } = acceptGeneratedAnswer(raw, hits);
      if (content) {
        return {
          content,
          provider: tier.provider,
          model: tier.model,
          errors: errors.length ? errors : null,
        };
      }
      errors.push(`${tier.provider}${failure}`);
      console.warn(`⚠ ${tier.provider}${failure}; trying next tier`);
    } catch (error) {
      if (error.clientAborted) throw error;
      errors.push(`${tier.provider}: ${error.message}`);
      console.warn(`⚠ ${tier.provider} stream failed:`, error.message);
    }
    resetIfShown();
  }

  const fallback = fallbackAfterAllTiers(errors, hits);
  if (!fallback.refused) emitFrom({ provider: "extractive", model: null })(fallback.content);
  return fallback;
};
