import OpenAI from "openai";
import { ServiceError } from "../errors.js";
import {
  callSignal,
  invalidModelOutput,
  providerError,
  providerNotConfigured,
  providerTimeout,
} from "./errors.js";
import { firstTokenSignal, readLines } from "./stream.js";

// Same limits and prompt helpers as the backend's modules/ai (ai.provider.service.js and utils/).
const MAX_INPUT_CHARS = 32_000;

const ensureJsonHintInInput = (input) => {
  const text = String(input ?? "").trim();
  if (/json/i.test(text)) return text;
  return `${text}\n\nRespond with a valid JSON object only (no markdown).`;
};

const appendJsonOnlyInstruction = (instructions) => {
  const base = String(instructions ?? "").trim();
  if (/json/i.test(base)) return base;
  return `${base}\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown fences, no extra prose.`;
};

const parseJsonFromModelText = (text) => {
  const cleaned = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return cleaned ? JSON.parse(cleaned) : null;
};

const extractResponseText = (response) => {
  if (response?.output_text) return response.output_text;
  const chunks = [];
  for (const output of response?.output ?? []) {
    if (output.type !== "message") continue;
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("");
};

// OpenAI answers 400 when a model does not support `text.format: json_object`.
const isJsonFormatRequestError = (error) =>
  (error?.status ?? error?.response?.status) === 400 &&
  /json|text\.format|format|invalid_request/i.test(String(error?.message ?? error?.error?.message ?? ""));

const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

/**
 * OpenAI, with the requests the backend used to send itself:
 *   json()   Responses API in JSON mode, like the backend's `generateJson`: json_object first,
 *            plain text with a "JSON only" instruction when the model rejects that format
 *   chat()   Chat Completions, one piece (assistant.llm.js generateWithOpenAI)
 *   stream() Chat Completions streamed (assistant.llm.js streamWithOpenAI)
 * `createClient(apiKey)` and `fetchImpl` are injectable for tests.
 */
export const createOpenAI = (
  config,
  {
    createClient = (apiKey) => new OpenAI({ apiKey }),
    fetchImpl = (...args) => globalThis.fetch(...args),
  } = {},
) => {
  const completions = async (body, signal) => {
    if (!config.openai.apiKey) throw providerNotConfigured("OpenAI");
    const response = await fetchImpl(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openai.apiKey}` },
      body: JSON.stringify({ model: config.openai.model, ...body }),
      signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw providerError("OpenAI", `HTTP ${response.status} ${detail.slice(0, 180)}`);
    }
    return response;
  };

  const chatMessages = (system, user) => [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  let client = null;
  const getClient = () => (client ??= createClient(config.openai.apiKey));

  const request = (params, signal, useJsonFormat) =>
    getClient().responses.create(
      {
        ...params,
        instructions: useJsonFormat ? params.instructions : appendJsonOnlyInstruction(params.instructions),
        ...(useJsonFormat ? { text: { format: { type: "json_object" } } } : {}),
      },
      { signal, maxRetries: 0 },
    );

  return {
    model: config.openai.model,

    async json({ system, user, maxTokens, temperature, timeoutMs, signal }) {
      if (!config.openai.apiKey) throw providerNotConfigured("OpenAI");
      const call = callSignal(timeoutMs, signal);
      const params = {
        model: config.openai.model,
        instructions: String(system ?? "").trim(),
        input: ensureJsonHintInInput(String(user ?? "").slice(0, MAX_INPUT_CHARS)),
        temperature,
        max_output_tokens: maxTokens,
      };

      try {
        let response;
        try {
          response = await request(params, call.signal, true);
        } catch (error) {
          if (!isJsonFormatRequestError(error)) throw error;
          response = await request(params, call.signal, false);
        }
        let json = null;
        try {
          json = parseJsonFromModelText(extractResponseText(response));
        } catch {
          json = null;
        }
        if (!json || typeof json !== "object") throw invalidModelOutput("OpenAI");
        return { model: config.openai.model, json };
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        if (call.timedOut()) throw providerTimeout("OpenAI", timeoutMs);
        throw providerError("OpenAI", error?.message ?? String(error));
      }
    },

    async chat({ system, user, maxTokens, temperature, timeoutMs, signal }) {
      const call = callSignal(timeoutMs, signal);
      try {
        const response = await completions(
          { temperature, max_completion_tokens: maxTokens, messages: chatMessages(system, user) },
          call.signal,
        );
        const data = await response.json();
        return { model: config.openai.model, content: String(data?.choices?.[0]?.message?.content ?? "") };
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        if (call.timedOut()) throw providerTimeout("OpenAI", timeoutMs);
        throw providerError("OpenAI", error?.message ?? String(error));
      }
    },

    /** Yields tokens. `timeoutMs` is the wait for the first one. */
    async *stream({ system, user, maxTokens, temperature, timeoutMs, signal }) {
      const watch = firstTokenSignal(timeoutMs, signal);
      try {
        const response = await completions(
          {
            temperature,
            max_completion_tokens: maxTokens,
            stream: true,
            messages: chatMessages(system, user),
          },
          watch.signal,
        );
        for await (const line of readLines(response.body)) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;
          const token = JSON.parse(payload).choices?.[0]?.delta?.content ?? "";
          if (token) {
            watch.gotToken();
            yield token;
          }
        }
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        if (watch.timedOut()) throw providerTimeout("OpenAI", timeoutMs);
        throw providerError("OpenAI", error?.message ?? String(error));
      } finally {
        watch.stop();
      }
    },
  };
};
