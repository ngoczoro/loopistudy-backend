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
import { aiServiceClient } from "../../shared/ai/aiServiceClient.js";

/*
 * With AI_SERVICE_URL set, the model calls below go through the AI service
 * (POST /v1/llm/chat and /v1/llm/chat/stream) and the service holds the Ollama URL and the
 * OpenAI key. Everything else stays here: prompts, the Ollama → OpenAI → extractive order,
 * refusal detection, citation clean-up, and the first-token / idle watchdog.
 */
const viaService = () => aiServiceClient.enabled();
// Extra wait on our side so the service's own first-token timeout answers first.
const SERVICE_MARGIN_MS = 5_000;

const ASK_SETTINGS = {
  ollama: { maxTokens: 512, temperature: 0.2 },
  openai: { maxTokens: 700, temperature: 0.2 },
};

const promptsFor = (provider, { question, hits }) =>
  provider === "ollama"
    ? { system: buildOllamaSystemPrompt(), user: buildOllamaUserPrompt({ question, hits }) }
    : { system: buildRagSystemPrompt(), user: buildRagUserPrompt({ question, hits }) };

/** Whether the Ollama tier can run: the service decides when it is on, else OLLAMA_URL. */
const ollamaTierAvailable = () => viaService() || Boolean(resolveOllamaBaseUrl());

/** One whole answer from the service. `{ text, model }`; throws on any failure. */
const generateWithService = async (provider, { question, hits }, timeoutMs, label) => {
  const result = await aiServiceClient.post(
    "/v1/llm/chat",
    { provider, ...promptsFor(provider, { question, hits }), ...ASK_SETTINGS[provider], timeoutMs },
    { timeoutMs: timeoutMs + SERVICE_MARGIN_MS, priority: "chat" },
  );
  const text = String(result?.content ?? "").trim();
  if (!text) throw new Error(`${label} returned an empty answer`);
  return { text, model: result.model };
};

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

/** `{ text, model }` */
export const generateWithOllama = async ({ question, hits }) => {
  if (viaService()) return generateWithService("ollama", { question, hits }, OLLAMA_TIMEOUT_MS, "Ollama");
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
  return { text, model: OLLAMA_MODEL };
};

/** `{ text, model }` */
export const generateWithOpenAI = async ({ question, hits }) => {
  if (viaService()) {
    return generateWithService("openai", { question, hits }, OPENAI_ASSISTANT_TIMEOUT_MS, "OpenAI");
  }
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
  return { text, model: model || "gpt-4.1-mini" };
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

/**
 * Stream one provider's answer through the AI service (POST /v1/llm/chat/stream, SSE:
 * start → token… → done | error). Our watchdog still guards the first token and the gaps
 * between tokens; `onModel` gets the model the service really runs, before the first token.
 */
const streamWithService = async (provider, { question, hits, onToken, onModel, signal }, firstTokenMs, label) => {
  const watchdog = createTokenWatchdog({
    firstTokenMs: firstTokenMs + SERVICE_MARGIN_MS,
    idleMs: STREAM_IDLE_TIMEOUT_MS,
    outerSignal: signal,
    label,
  });
  let text = "";
  try {
    const response = await aiServiceClient.stream(
      "/v1/llm/chat/stream",
      { provider, ...promptsFor(provider, { question, hits }), ...ASK_SETTINGS[provider], timeoutMs: firstTokenMs },
      { signal: watchdog.signal, priority: "chat" },
    );

    let event = null;
    for await (const line of readLines(response.body)) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
        continue;
      }
      if (!line.startsWith("data:")) continue;
      const data = JSON.parse(line.slice(5).trim());
      if (event === "start") onModel?.(data.model);
      if (event === "token" && data.text) {
        watchdog.tokenReceived();
        text += data.text;
        onToken(data.text);
      }
      if (event === "error") throw new Error(`${label}: ${data.message}`);
      if (event === "done") break;
    }
  } catch (error) {
    throw Object.assign(watchdog.toError(error), { emitted: text.length > 0 });
  } finally {
    watchdog.stop();
  }

  if (!text.trim()) throw new Error(`${label} returned an empty answer`);
  return text.trim();
};

export const streamWithOllama = async ({ question, hits, onToken, onModel, signal }) => {
  if (viaService()) {
    return streamWithService("ollama", { question, hits, onToken, onModel, signal }, OLLAMA_FIRST_TOKEN_TIMEOUT_MS, "Ollama");
  }
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

export const streamWithOpenAI = async ({ question, hits, onToken, onModel, signal }) => {
  if (viaService()) {
    return streamWithService("openai", { question, hits, onToken, onModel, signal }, OPENAI_ASSISTANT_TIMEOUT_MS, "OpenAI");
  }
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

  if (ollamaTierAvailable()) {
    try {
      const { text: raw, model } = await generateWithOllama({ question, hits });
      const { content, failure } = acceptGeneratedAnswer(raw, hits);
      if (content) {
        return { content, provider: "ollama", model };
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
    const { text: raw, model } = await generateWithOpenAI({ question, hits });
    const { content, failure } = acceptGeneratedAnswer(raw, hits);
    if (content) {
      return {
        content,
        provider: "openai",
        model,
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
  if (ollamaTierAvailable()) {
    tiers.push({ provider: "ollama", model: OLLAMA_MODEL, run: streamWithOllama });
  } else {
    errors.push("ollama: OLLAMA_URL empty");
  }
  tiers.push({ provider: "openai", model: getOpenAIConfig().model, run: streamWithOpenAI });

  for (const tier of tiers) {
    try {
      // Through the AI service, the `start` event names the model it really runs.
      const source = { provider: tier.provider, model: tier.model };
      const onModel = (model) => {
        if (model) source.model = model;
      };
      const raw = await tier.run({ question, hits, onToken: emitFrom(source), onModel, signal });
      const { content, failure } = acceptGeneratedAnswer(raw, hits);
      if (content) {
        return {
          content,
          provider: tier.provider,
          model: source.model,
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
