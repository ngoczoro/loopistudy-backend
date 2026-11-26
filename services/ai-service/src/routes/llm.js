import { Router } from "express";
import { invalidRequest } from "../errors.js";

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

const readJsonRequest = (body = {}) => {
  if (!PROVIDERS.has(body.provider)) throw invalidRequest('provider must be "ollama" or "openai"');
  const schema = body.schema ?? null;
  if (schema !== null && (typeof schema !== "object" || Array.isArray(schema))) {
    throw invalidRequest("schema must be a JSON Schema object or null");
  }
  return {
    provider: body.provider,
    system: requiredText(body.system, "system"),
    user: requiredText(body.user, "user"),
    schema,
    maxTokens: optionalNumber(body.maxTokens, "maxTokens", { fallback: 800, min: 1, max: MAX_TOKENS, integer: true }),
    temperature: optionalNumber(body.temperature, "temperature", { fallback: 0.4, min: 0, max: 2 }),
    timeoutMs: optionalNumber(body.timeoutMs, "timeoutMs", {
      fallback: 60_000,
      min: 1,
      max: MAX_TIMEOUT_MS,
      integer: true,
    }),
  };
};

/** Aborts when the backend closes the connection before the answer is sent. */
const abortOnClose = (req, res) => {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  return controller.signal;
};

/** POST /v1/llm/json (API.md). Calls only the provider asked for; the backend picks the order. */
export const llmRouter = ({ providers }) => {
  const router = Router();

  router.post("/v1/llm/json", async (req, res) => {
    const request = readJsonRequest(req.body);
    const started = Date.now();
    const { model, json } = await providers[request.provider].json({
      ...request,
      signal: abortOnClose(req, res),
    });
    res.json({ provider: request.provider, model, json, durationMs: Date.now() - started });
  });

  return router;
};
