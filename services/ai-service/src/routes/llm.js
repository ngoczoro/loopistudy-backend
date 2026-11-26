import { Router } from "express";
import { ServiceError, invalidRequest } from "../errors.js";

const PROVIDERS = new Set(["ollama", "openai"]);
const MAX_TIMEOUT_MS = 120_000;
const MAX_TOKENS = 4_000;

const optionalNumber = (value, name, { fallback, min, max, integer = false }) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw invalidRequest(`${name} must be a number from ${min} to ${max}`);
  }
  if (integer && !Number.isInteger(value)) throw invalidRequest(`${name} must be a whole number`);
  return value;
};

const requiredText = (value, name) => {
  if (typeof value !== "string" || !value.trim()) throw invalidRequest(`${name} must be a non-empty string`);
  return value;
};

/** Fields every LLM endpoint takes; `defaults` differ (JSON for quizzes, chat for Ask AI). */
const readCommon = (body, defaults) => {
  if (!PROVIDERS.has(body.provider)) throw invalidRequest('provider must be "ollama" or "openai"');
  return {
    provider: body.provider,
    system: requiredText(body.system, "system"),
    user: requiredText(body.user, "user"),
    maxTokens: optionalNumber(body.maxTokens, "maxTokens", {
      fallback: defaults.maxTokens,
      min: 1,
      max: MAX_TOKENS,
      integer: true,
    }),
    temperature: optionalNumber(body.temperature, "temperature", {
      fallback: defaults.temperature,
      min: 0,
      max: 2,
    }),
    timeoutMs: optionalNumber(body.timeoutMs, "timeoutMs", {
      fallback: 60_000,
      min: 1,
      max: MAX_TIMEOUT_MS,
      integer: true,
    }),
  };
};

const readJsonRequest = (body = {}) => {
  const schema = body.schema ?? null;
  const common = readCommon(body, { maxTokens: 800, temperature: 0.4 });
  if (schema !== null && (typeof schema !== "object" || Array.isArray(schema))) {
    throw invalidRequest("schema must be a JSON Schema object or null");
  }
  return { ...common, schema };
};

// Ask AI's settings in the backend: Ollama num_predict 512, temperature 0.2.
const readChatRequest = (body = {}) => readCommon(body, { maxTokens: 512, temperature: 0.2 });

/** `x-priority: chat` (Ask AI) goes ahead of `study` (the default) in the Ollama queue. */
const priorityOf = (req) => (req.get("x-priority") === "chat" ? "chat" : "study");

const sendEvent = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

/** Aborts when the backend closes the connection before the answer is sent. */
const abortOnClose = (req, res) => {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  return controller.signal;
};

/**
 * POST /v1/llm/json, /v1/llm/chat and /v1/llm/chat/stream (API.md).
 * Each calls only the provider asked for; the backend picks the order and judges the answer.
 */
export const llmRouter = ({ providers }) => {
  const router = Router();

  router.post("/v1/llm/json", async (req, res) => {
    const request = readJsonRequest(req.body);
    const started = Date.now();
    const { model, json } = await providers[request.provider].json({
      ...request,
      priority: priorityOf(req),
      signal: abortOnClose(req, res),
    });
    res.json({ provider: request.provider, model, json, durationMs: Date.now() - started });
  });

  router.post("/v1/llm/chat", async (req, res) => {
    const request = readChatRequest(req.body);
    const started = Date.now();
    const { model, content } = await providers[request.provider].chat({
      ...request,
      priority: priorityOf(req),
      signal: abortOnClose(req, res),
    });
    res.json({ provider: request.provider, model, content, durationMs: Date.now() - started });
  });

  /**
   * Nothing is sent until the first token: an error before it is a normal JSON error
   * (the backend tries its next provider), after it an `error` event ends the stream.
   * Closing the connection cancels the provider call.
   */
  router.post("/v1/llm/chat/stream", async (req, res) => {
    const request = readChatRequest(req.body);
    const provider = providers[request.provider];
    const signal = abortOnClose(req, res);
    const started = Date.now();
    let tokens = 0;

    try {
      for await (const text of provider.stream({ ...request, priority: priorityOf(req), signal })) {
        if (tokens === 0) {
          res.status(200).set({
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          });
          res.flushHeaders();
          sendEvent(res, "start", { provider: request.provider, model: provider.model });
        }
        tokens += 1;
        sendEvent(res, "token", { text });
      }
    } catch (error) {
      if (tokens === 0) throw error; // still a plain HTTP error
      if (!signal.aborted) {
        sendEvent(res, "error", { code: error.code ?? "INTERNAL", message: error.message });
      }
      res.end();
      return;
    }

    if (tokens === 0) {
      throw new ServiceError(502, "INVALID_MODEL_OUTPUT", `${request.provider} returned an empty answer`);
    }
    sendEvent(res, "done", { durationMs: Date.now() - started, tokens });
    res.end();
  });

  return router;
};
