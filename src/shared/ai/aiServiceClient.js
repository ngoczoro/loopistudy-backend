import { randomUUID } from "node:crypto";

/**
 * HTTP client for the AI service (services/ai-service, contract in its API.md).
 *
 * The service is used only when AI_SERVICE_URL is set; otherwise `aiServiceEnabled()` is
 * false and callers keep doing the work in this backend.
 *
 * Circuit breaker: after FAILURE_THRESHOLD failures in a row the client stops calling the
 * service for COOLDOWN_MS and fails at once, so a dead service never slows requests down.
 * After the cooldown one request is let through; success closes the circuit again.
 */
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export class AiServiceError extends Error {
  constructor(message, { status = null, code = "AI_SERVICE_UNAVAILABLE", retryAfterSec = null } = {}) {
    super(message);
    this.name = "AiServiceError";
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

const readSettings = (env) => ({
  url: String(env.AI_SERVICE_URL ?? "").trim().replace(/\/$/, ""),
  key: String(env.AI_SERVICE_KEY ?? "").trim(),
  timeoutMs: Number(env.AI_SERVICE_TIMEOUT_MS) > 0 ? Number(env.AI_SERVICE_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS,
});

/** `env`, `fetchImpl` and `now` are injectable for tests. */
export const createAiServiceClient = ({
  env = process.env,
  // Looked up per call so tests can replace globalThis.fetch.
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = Date.now,
} = {}) => {
  let failures = 0;
  let openUntil = 0;
  let trialInFlight = false;

  const settings = () => readSettings(env);

  const recordFailure = () => {
    failures += 1;
    if (failures >= FAILURE_THRESHOLD) openUntil = now() + COOLDOWN_MS;
  };

  const recordSuccess = () => {
    failures = 0;
    openUntil = 0;
  };

  /**
   * Sends the request; returns the OK response (body unread) or throws AiServiceError for
   * every failure: network, timeout, open circuit, HTTP error.
   * Only failures of the service itself count towards the circuit breaker: no answer, a
   * wrong key, or a 5xx without a known code. Errors it reports about the request (400, 413),
   * a provider (Ollama down, OpenAI failed, bad JSON), a model still loading or a full queue
   * mean the service is up, so they do not stop the other provider being tried through it.
   * `timeoutMs: null` sets no limit (streams: the caller's `signal` decides).
   */
  const send = async (path, body, { timeoutMs, signal, priority, requestId } = {}) => {
    const { url, key, timeoutMs: defaultTimeout } = settings();
    if (!url) throw new AiServiceError("AI_SERVICE_URL is not set", { code: "AI_SERVICE_DISABLED" });

    const halfOpen = openUntil > 0 && now() >= openUntil;
    if (openUntil > now() || (halfOpen && trialInFlight)) {
      throw new AiServiceError("AI service is unavailable (circuit open)", { code: "AI_SERVICE_CIRCUIT_OPEN" });
    }
    if (halfOpen) trialInFlight = true;

    const limit = timeoutMs === null ? null : (timeoutMs ?? defaultTimeout);
    const timeout = limit === null ? null : AbortSignal.timeout(limit);
    const signals = [signal, timeout].filter(Boolean);
    const combined = signals.length > 1 ? AbortSignal.any(signals) : signals[0];

    try {
      let response;
      try {
        response = await fetchImpl(`${url}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": key,
            "x-request-id": requestId ?? randomUUID(),
            ...(priority ? { "x-priority": priority } : {}),
          },
          body: JSON.stringify(body),
          signal: combined,
        });
      } catch (error) {
        // The caller cancelled: not the service's fault.
        if (signal?.aborted) throw error;
        recordFailure();
        const timedOut = Boolean(timeout?.aborted);
        throw new AiServiceError(
          timedOut ? `AI service did not answer within ${limit}ms` : `AI service unreachable: ${error.message}`,
          { code: timedOut ? "AI_SERVICE_TIMEOUT" : "AI_SERVICE_UNAVAILABLE" },
        );
      }

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        const code = json?.error?.code;
        const serviceBroken =
          response.status === 401 || (response.status >= 500 && (!code || code === "INTERNAL"));
        if (serviceBroken) recordFailure();
        throw new AiServiceError(json?.error?.message ?? `AI service HTTP ${response.status}`, {
          status: response.status,
          code: code ?? "AI_SERVICE_ERROR",
          retryAfterSec: Number(response.headers.get("retry-after")) || null,
        });
      }
      recordSuccess();
      return response;
    } finally {
      if (halfOpen) trialInFlight = false;
    }
  };

  /** POST `body` as JSON to `path` and return the parsed JSON answer. */
  const post = async (path, body, options) => (await send(path, body, options)).json();

  /**
   * POST to a Server-Sent Events endpoint; resolves with the OK response to read
   * `response.body` from. No time limit of its own: the caller's `signal` stops it.
   */
  const stream = (path, body, { signal, priority, requestId } = {}) =>
    send(path, body, { timeoutMs: null, signal, priority, requestId });

  return {
    enabled: () => Boolean(settings().url),
    post,
    stream,
    /** For tests and /health-style checks. */
    circuitState: () => (openUntil > now() ? "open" : openUntil > 0 ? "half-open" : "closed"),
  };
};

export const aiServiceClient = createAiServiceClient();
export const aiServiceEnabled = () => aiServiceClient.enabled();
