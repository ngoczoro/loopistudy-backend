import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import { createQueue, withQueue } from "../src/queue.js";
import { createStatus } from "../src/status.js";

const tick = () => new Promise((resolve) => setImmediate(resolve));

/** A clock the tests move by hand. */
const clock = () => {
  let time = 0;
  return { now: () => time, advance: (ms) => (time += ms) };
};

describe("createQueue", () => {
  test("runs one at a time and lets the next in when a slot is released", async () => {
    const queue = createQueue({ concurrency: 1, maxWaiting: 3 });
    const first = await queue.acquire();
    let secondStarted = false;
    const second = queue.acquire().then((slot) => {
      secondStarted = true;
      return slot;
    });
    await tick();
    expect(secondStarted).toBe(false);
    expect(queue.stats()).toMatchObject({ running: 1, waiting: 1 });

    first.release();
    const slot = await second;
    expect(secondStarted).toBe(true);
    expect(queue.stats()).toMatchObject({ running: 1, waiting: 0 });
    slot.release();
    expect(queue.stats().running).toBe(0);
  });

  test("Ask AI (chat) goes ahead of quizzes (study), first come first served within each", async () => {
    const queue = createQueue({ concurrency: 1, maxWaiting: 5 });
    const busy = await queue.acquire();
    const order = [];
    const join = (name, priority) =>
      queue.acquire({ priority }).then((slot) => {
        order.push(name);
        slot.release();
      });
    const all = [join("quiz-1", "study"), join("quiz-2", "study"), join("chat-1", "chat"), join("chat-2", "chat")];
    await tick();
    busy.release();
    await Promise.all(all);
    expect(order).toEqual(["chat-1", "chat-2", "quiz-1", "quiz-2"]);
  });

  test("a full line answers QUEUE_FULL at once with Retry-After", async () => {
    const queue = createQueue({ concurrency: 1, maxWaiting: 1 });
    await queue.acquire();
    queue.acquire().catch(() => {});
    await expect(queue.acquire()).rejects.toMatchObject({
      status: 503,
      code: "QUEUE_FULL",
      retryAfterSec: expect.any(Number),
    });
  });

  test("maxWaiting 0 never queues", async () => {
    const queue = createQueue({ concurrency: 1, maxWaiting: 0 });
    await queue.acquire();
    await expect(queue.acquire()).rejects.toMatchObject({ code: "QUEUE_FULL" });
  });

  test("refuses at once when the expected wait would not fit in the caller's timeout", async () => {
    const time = clock();
    const queue = createQueue({ concurrency: 1, maxWaiting: 3, now: time.now });
    // Teach it that a call takes 40 s.
    const learn = await queue.acquire();
    time.advance(40_000);
    learn.release();

    await queue.acquire(); // busy now
    // One call ahead (~40 s) fits in 60 s: wait.
    const fits = queue.acquire({ priority: "chat", timeoutMs: 60_000 });
    await tick();
    expect(queue.stats().waiting).toBe(1);
    // Two ahead (~80 s) do not: QUEUE_FULL now, with the wait as Retry-After.
    await expect(queue.acquire({ priority: "chat", timeoutMs: 60_000 })).rejects.toMatchObject({
      code: "QUEUE_FULL",
      retryAfterSec: 80,
    });
    fits.catch(() => {});
  });

  test("a chat request is judged only by what is ahead of it", async () => {
    const time = clock();
    const queue = createQueue({ concurrency: 1, maxWaiting: 3, now: time.now });
    const learn = await queue.acquire();
    time.advance(40_000);
    learn.release();
    await queue.acquire();
    queue.acquire({ priority: "study" }).catch(() => {}); // a quiz waiting behind
    queue.acquire({ priority: "study" }).catch(() => {});
    await tick();
    // The quizzes are behind any chat, so only the running call counts: ~40 s < 60 s.
    const chat = queue.acquire({ priority: "chat", timeoutMs: 60_000 });
    await tick();
    expect(queue.stats().waiting).toBe(3);
    chat.catch(() => {});
  });

  test("before any call has finished, assumes 30 s per call", async () => {
    const queue = createQueue({ concurrency: 1, maxWaiting: 3 });
    await queue.acquire();
    const waits = queue.acquire({ priority: "chat", timeoutMs: 60_000 }); // ~30 s ahead: fits
    await tick();
    expect(queue.stats().waiting).toBe(1);
    // ~60 s ahead does not fit in 60 s.
    await expect(queue.acquire({ priority: "chat", timeoutMs: 60_000 })).rejects.toMatchObject({
      code: "QUEUE_FULL",
      retryAfterSec: 60,
    });
    waits.catch(() => {});
  });

  test("waiting longer than timeoutMs leaves the line with PROVIDER_TIMEOUT", async () => {
    // Calls look short (1 ms), so it queues, but the running one never finishes.
    const queue = createQueue({ concurrency: 1, maxWaiting: 3, initialRunMs: 1 });
    await queue.acquire();
    await expect(queue.acquire({ timeoutMs: 20 })).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
    expect(queue.stats().waiting).toBe(0);
  });

  test("a caller that gives up leaves the line and does not take a slot later", async () => {
    const queue = createQueue({ concurrency: 1, maxWaiting: 3 });
    const busy = await queue.acquire();
    const controller = new AbortController();
    const gaveUp = queue.acquire({ signal: controller.signal });
    await tick();
    controller.abort();
    await expect(gaveUp).rejects.toThrow();
    expect(queue.stats().waiting).toBe(0);
    busy.release();
    expect(queue.stats().running).toBe(0);
  });

  test("releasing twice frees only one slot", async () => {
    const queue = createQueue({ concurrency: 2, maxWaiting: 3 });
    const a = await queue.acquire();
    await queue.acquire();
    a.release();
    a.release();
    expect(queue.stats().running).toBe(1);
  });

  test("reports average wait and run times", async () => {
    const time = clock();
    const queue = createQueue({ concurrency: 1, maxWaiting: 3, now: time.now });
    const first = await queue.acquire();
    const second = queue.acquire();
    time.advance(10_000);
    first.release();
    (await second).release();
    expect(queue.stats()).toMatchObject({ concurrency: 1, maxWaiting: 3, avgWaitMs: 5_000 });
  });
});

describe("withQueue", () => {
  test("time spent waiting comes off the call's timeout, and the slot is freed after a failure", async () => {
    const time = clock();
    const queue = createQueue({ concurrency: 1, maxWaiting: 3, now: time.now });
    const seen = [];
    const provider = withQueue(
      {
        model: "m",
        json: async (args) => {
          seen.push(args.timeoutMs);
          throw new Error("Ollama down");
        },
      },
      queue,
    );
    const busy = await queue.acquire();
    const call = provider.json({ timeoutMs: 45_000 });
    await tick();
    time.advance(15_000);
    busy.release();
    await expect(call).rejects.toThrow("Ollama down");
    expect(seen).toEqual([30_000]);
    expect(queue.stats().running).toBe(0);
  });

  test("a stream holds its slot until the last token", async () => {
    const queue = createQueue({ concurrency: 1, maxWaiting: 3 });
    const provider = withQueue(
      {
        async *stream() {
          yield "a";
          yield "b";
        },
      },
      queue,
    );
    const tokens = provider.stream({ timeoutMs: 1000 });
    expect((await tokens.next()).value).toBe("a");
    expect(queue.stats().running).toBe(1);
    await tokens.next();
    await tokens.next();
    expect(queue.stats().running).toBe(0);
  });
});

describe("through the HTTP routes", () => {
  const KEY = "test-key";

  const build = () => {
    const config = loadConfig({ AI_SERVICE_KEY: KEY, LOG_LEVEL: "silent" });
    const queue = createQueue({ concurrency: 1, maxWaiting: 0 });
    let finish;
    const ollama = withQueue(
      {
        model: "qwen2.5:3b",
        json: () => new Promise((resolve) => (finish = () => resolve({ model: "qwen2.5:3b", json: {} }))),
      },
      queue,
    );
    const app = createApp({
      config,
      logger: createLogger("silent"),
      status: createStatus(config, { fetchImpl: async () => ({ ok: true }) }),
      providers: { ollama },
      queue,
    });
    return { app, finish: () => finish() };
  };

  test("a busy Ollama answers 503 QUEUE_FULL with Retry-After, and /health shows the queue", async () => {
    const { app, finish } = build();
    const body = { provider: "ollama", system: "s", user: "u" };
    const first = request(app).post("/v1/llm/json").set("x-internal-key", KEY).send(body).then((r) => r);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const health = await request(app).get("/health");
    expect(health.body.queue).toMatchObject({ running: 1, waiting: 0, concurrency: 1, maxWaiting: 0 });

    const second = await request(app).post("/v1/llm/json").set("x-internal-key", KEY).send(body);
    expect(second.status).toBe(503);
    expect(second.body.error.code).toBe("QUEUE_FULL");
    expect(Number(second.headers["retry-after"])).toBeGreaterThan(0);

    finish();
    expect((await first).status).toBe(200);
  });
});
