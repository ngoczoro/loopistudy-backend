import { ServiceError } from "./errors.js";

const PRIORITY_RANK = { chat: 0, study: 1 };
// Smoothing for the average run time; a recent answer weighs 30%.
const EMA_WEIGHT = 0.3;
const AVG_WAIT_SAMPLES = 20;

export const queueFull = (message, retryAfterSec) =>
  new ServiceError(503, "QUEUE_FULL", message, { retryAfterSec });

const queueTimeout = (label, ms) =>
  new ServiceError(504, "PROVIDER_TIMEOUT", `${label} queue wait exceeded ${ms}ms`);

/**
 * Lets at most `concurrency` calls use Ollama at once; the rest wait in line.
 *   - `chat` (Ask AI, someone is watching) goes ahead of `study` (quiz, flashcards).
 *   - A full line (`maxWaiting`) answers QUEUE_FULL at once, so the backend uses OpenAI
 *     instead of waiting out its timeout.
 *   - So does a wait that would not fit in the caller's `timeoutMs`, judged from how long
 *     recent calls took: a CPU Ollama needs ~15-45 s per answer.
 *   - A caller that gives up (`signal`) leaves the line.
 * `acquire()` resolves with `{ release, waitedMs }`; call `release()` exactly once when done.
 */
export const createQueue = ({
  concurrency = 1,
  maxWaiting = 3,
  // Assumed length of a call until one has finished: a CPU Ollama answer.
  initialRunMs = 30_000,
  label = "Ollama",
  now = Date.now,
} = {}) => {
  const slots = Math.max(1, Math.floor(concurrency));
  const waiting = []; // { rank, enqueuedAt, resolve, reject, cleanup }
  let running = 0;
  let avgRunMs = null;
  const recentWaits = [];

  const recordWait = (ms) => {
    recentWaits.push(ms);
    if (recentWaits.length > AVG_WAIT_SAMPLES) recentWaits.shift();
  };

  const recordRun = (ms) => {
    avgRunMs = avgRunMs === null ? ms : Math.round(avgRunMs * (1 - EMA_WEIGHT) + ms * EMA_WEIGHT);
  };

  /** Time until a new caller of `rank` would start (`initialRunMs` per call until measured). */
  const estimateWaitMs = (rank) => {
    const ahead = running + waiting.filter((entry) => entry.rank <= rank).length;
    const rounds = Math.floor(ahead / slots);
    return rounds * (avgRunMs ?? initialRunMs);
  };

  const grant = () => {
    const startedAt = now();
    running += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      running -= 1;
      recordRun(now() - startedAt);
      next();
    };
  };

  const next = () => {
    while (running < slots && waiting.length) {
      const entry = waiting.shift();
      entry.cleanup();
      const waitedMs = now() - entry.enqueuedAt;
      recordWait(waitedMs);
      entry.resolve({ release: grant(), waitedMs });
    }
  };

  const acquire = ({ priority = "study", timeoutMs = null, signal } = {}) => {
    if (signal?.aborted) return Promise.reject(signal.reason ?? new Error("aborted"));
    const rank = PRIORITY_RANK[priority] ?? PRIORITY_RANK.study;

    if (running < slots && waiting.length === 0) {
      recordWait(0);
      return Promise.resolve({ release: grant(), waitedMs: 0 });
    }

    const estimate = estimateWaitMs(rank);
    const retryAfterSec = Math.max(1, Math.ceil(estimate / 1000));
    if (waiting.length >= maxWaiting) {
      return Promise.reject(queueFull(`${label} queue is full (${waiting.length} waiting)`, retryAfterSec));
    }
    if (timeoutMs !== null && estimate >= timeoutMs) {
      return Promise.reject(
        queueFull(`${label} is busy: about ${estimate}ms to wait, more than the ${timeoutMs}ms allowed`, retryAfterSec),
      );
    }

    return new Promise((resolve, reject) => {
      const entry = { rank, enqueuedAt: now(), resolve, reject };
      const leave = (error) => {
        const index = waiting.indexOf(entry);
        if (index >= 0) waiting.splice(index, 1);
        entry.cleanup();
        reject(error);
      };
      const timer =
        timeoutMs === null ? null : setTimeout(() => leave(queueTimeout(label, timeoutMs)), timeoutMs);
      const onAbort = () => leave(signal.reason ?? new Error("aborted"));
      signal?.addEventListener("abort", onAbort, { once: true });
      entry.cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };

      // Behind everyone of the same or higher priority, ahead of lower ones.
      const at = waiting.findIndex((other) => other.rank > rank);
      if (at < 0) waiting.push(entry);
      else waiting.splice(at, 0, entry);
    });
  };

  return {
    acquire,
    stats: () => ({
      running,
      waiting: waiting.length,
      concurrency: slots,
      maxWaiting,
      avgWaitMs: recentWaits.length
        ? Math.round(recentWaits.reduce((sum, ms) => sum + ms, 0) / recentWaits.length)
        : 0,
      avgRunMs,
    }),
  };
};

/**
 * The same provider, but every call takes a queue slot first and gives it back when the
 * answer (or the stream) ends. Time spent waiting comes off the call's `timeoutMs`.
 */
export const withQueue = (provider, queue) => {
  const remaining = (timeoutMs, waitedMs) => Math.max(1, timeoutMs - waitedMs);

  const once = (method) => async (args) => {
    const { release, waitedMs } = await queue.acquire(args);
    try {
      return await provider[method]({ ...args, timeoutMs: remaining(args.timeoutMs, waitedMs) });
    } finally {
      release();
    }
  };

  return {
    ...provider,
    json: once("json"),
    chat: once("chat"),
    async *stream(args) {
      const { release, waitedMs } = await queue.acquire(args);
      try {
        yield* provider.stream({ ...args, timeoutMs: remaining(args.timeoutMs, waitedMs) });
      } finally {
        release();
      }
    },
  };
};
