import { ServiceError } from "../errors.js";

/** Errors a provider (Ollama, OpenAI) causes; the backend tries its next provider on any of them. */
export const providerNotConfigured = (provider) =>
  new ServiceError(503, "PROVIDER_NOT_CONFIGURED", `${provider} is not configured on the AI service`);

export const providerTimeout = (provider, ms) =>
  new ServiceError(504, "PROVIDER_TIMEOUT", `${provider} timed out after ${ms}ms`);

export const providerError = (provider, detail) =>
  new ServiceError(502, "PROVIDER_ERROR", `${provider} failed: ${detail}`);

export const invalidModelOutput = (provider) =>
  new ServiceError(502, "INVALID_MODEL_OUTPUT", `${provider} returned no valid JSON`);

/**
 * One AbortSignal for a provider call: fires on the time limit or when the backend goes away.
 * `timedOut()` tells the two apart.
 */
export const callSignal = (timeoutMs, signal) => {
  const timeout = AbortSignal.timeout(timeoutMs);
  return {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    timedOut: () => timeout.aborted,
  };
};
