import {
  OLLAMA_MODEL,
  OLLAMA_TIMEOUT_MS,
  OLLAMA_URL,
  OPENAI_ASSISTANT_TIMEOUT_MS,
} from "./assistant.constants.js";
import {
  buildRagSystemPrompt,
  buildRagUserPrompt,
  looksLikeNotFoundRefusal,
  sanitizeCitationMarkers,
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
    options: {
      temperature: 0.2,
      num_predict: 512,
    },
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

/**
 * Try Ollama → OpenAI → extractive passages.
 * @returns {{ content: string, provider: string, errors?: string[] }}
 */
const acceptGeneratedAnswer = (raw, hits) => {
  const content = sanitizeCitationMarkers(raw, hits.length);
  if (hits.length > 0 && looksLikeNotFoundRefusal(content)) {
    return null;
  }
  return content;
};

export const generateRagAnswer = async ({ question, hits }) => {
  const errors = [];

  if (resolveOllamaBaseUrl()) {
    try {
      const raw = await generateWithOllama({ question, hits });
      const content = acceptGeneratedAnswer(raw, hits);
      if (content) {
        return { content, provider: "ollama", model: OLLAMA_MODEL };
      }
      errors.push("ollama: refused despite retrieved passages");
      console.warn(
        "⚠ Ollama refused despite retrieved passages; trying next tier",
      );
    } catch (error) {
      errors.push(`ollama: ${error.message}`);
      console.warn("⚠ Ollama answer failed:", error.message);
    }
  } else {
    errors.push("ollama: OLLAMA_URL empty");
  }

  try {
    const raw = await generateWithOpenAI({ question, hits });
    const content = acceptGeneratedAnswer(raw, hits);
    if (content) {
      return {
        content,
        provider: "openai",
        model: getOpenAIConfig().model,

        errors: errors.length ? errors : null,
      };
    }
    errors.push("openai: refused despite retrieved passages");
    console.warn(
      "⚠ OpenAI refused despite retrieved passages; using extractive",
    );
  } catch (error) {
    errors.push(`openai: ${error.message}`);
    console.warn("⚠ OpenAI answer failed:", error.message);
  }

  return {
    content: buildExtractiveAnswer(hits),
    provider: "extractive",
    errors,
  };
};
