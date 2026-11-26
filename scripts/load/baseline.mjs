#!/usr/bin/env node
/**
 * Baseline load test: does Ask AI slow the rest of the API down?
 *
 * 1. "idle":    light requests (GET /subjects) alone, for IDLE_SECONDS.
 * 2. "ai-load": ASK_USERS Ask AI questions streamed at the same time, while the same light
 *               requests keep running until every answer has finished.
 * Prints latency percentiles for both phases and per-answer timings, and saves them as JSON
 * under scripts/load/results/ so the numbers before and after the AI service split can be compared.
 *
 * Needs a running backend and an account with at least one indexed document.
 * Usage:  LOAD_EMAIL=... LOAD_PASSWORD=... node scripts/load/baseline.mjs
 * Settings (env): BASE_URL, ASK_USERS, IDLE_SECONDS, LIGHT_CONCURRENCY, LOAD_QUESTION,
 *                 ASK_TIMEOUT_MS, LABEL.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = (process.env.BASE_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
const EMAIL = process.env.LOAD_EMAIL;
const PASSWORD = process.env.LOAD_PASSWORD;
const ASK_USERS = Number(process.env.ASK_USERS || 5);
const IDLE_SECONDS = Number(process.env.IDLE_SECONDS || 20);
const LIGHT_CONCURRENCY = Number(process.env.LIGHT_CONCURRENCY || 2);
const ASK_TIMEOUT_MS = Number(process.env.ASK_TIMEOUT_MS || 180_000);
const QUESTION = process.env.LOAD_QUESTION || "Tóm tắt ý chính của tài liệu này.";
const LABEL = process.env.LABEL || "baseline";

if (!EMAIL || !PASSWORD) {
  console.error("Set LOAD_EMAIL and LOAD_PASSWORD (an account with indexed documents).");
  process.exit(1);
}

const percentile = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : null;

const summarize = (samples) => {
  const ok = samples.filter((s) => s.ok).map((s) => s.ms).sort((a, b) => a - b);
  return {
    requests: samples.length,
    errors: samples.length - ok.length,
    p50: percentile(ok, 50),
    p95: percentile(ok, 95),
    max: ok.at(-1) ?? null,
  };
};

const login = async () => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await response.json().catch(() => null);
  const token = body?.data?.accessToken;
  if (!response.ok || !token) {
    throw new Error(`Login failed (${response.status}): ${body?.message ?? "no token"}`);
  }
  return token;
};

/** Runs GET /subjects with `concurrency` workers until `shouldStop()` is true. */
const runLightLoad = async (token, shouldStop, concurrency = LIGHT_CONCURRENCY) => {
  const samples = [];
  const worker = async () => {
    while (!shouldStop()) {
      const started = performance.now();
      try {
        const response = await fetch(`${BASE_URL}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await response.arrayBuffer();
        samples.push({ ok: response.ok, ms: Math.round(performance.now() - started) });
      } catch {
        samples.push({ ok: false, ms: Math.round(performance.now() - started) });
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return samples;
};

const createConversation = async (token, index) => {
  const response = await fetch(`${BASE_URL}/assistant/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: `Load test ${LABEL} #${index + 1}` }),
  });
  const body = await response.json().catch(() => null);
  const id = body?.data?.id;
  if (!response.ok || !id) {
    throw new Error(`Could not create a conversation (${response.status}): ${body?.message}`);
  }
  return id;
};

const deleteConversation = (token, id) =>
  fetch(`${BASE_URL}/assistant/conversations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});

/** One streamed Ask AI answer: time to first token, total time, which provider answered. */
const askOnce = async (token, conversationId) => {
  const started = performance.now();
  const result = { ok: false, firstTokenMs: null, totalMs: null, provider: null, resets: 0, error: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${BASE_URL}/assistant/conversations/${conversationId}/messages/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: QUESTION }),
        signal: controller.signal,
      },
    );
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      throw new Error(`HTTP ${response.status}: ${body?.message ?? ""}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const name = raw.match(/^event: (.+)$/m)?.[1];
        const data = raw.match(/^data: (.*)$/m)?.[1];
        if (name === "token" && result.firstTokenMs === null) {
          result.firstTokenMs = Math.round(performance.now() - started);
        }
        if (name === "provider" && data) {
          const source = JSON.parse(data);
          result.provider = source.model ? `${source.provider}:${source.model}` : source.provider;
        }
        if (name === "reset") result.resets += 1;
        if (name === "error") throw new Error(data ? JSON.parse(data).message : "stream error");
        if (name === "done") result.ok = true;
      }
    }
    if (!result.ok) throw new Error("stream closed before done");
  } catch (error) {
    result.error = error.name === "AbortError" ? `timed out after ${ASK_TIMEOUT_MS}ms` : error.message;
  } finally {
    clearTimeout(timer);
    result.totalMs = Math.round(performance.now() - started);
    // An answer with no provider event came from the extractive fallback (no LLM).
    if (result.ok && !result.provider) result.provider = "extractive";
  }
  return result;
};

const main = async () => {
  console.log(`Backend: ${BASE_URL}`);
  const token = await login();

  console.log(`\n[1/2] idle: GET /subjects for ${IDLE_SECONDS}s (${LIGHT_CONCURRENCY} workers)...`);
  const idleEnd = Date.now() + IDLE_SECONDS * 1000;
  const idle = summarize(await runLightLoad(token, () => Date.now() >= idleEnd));

  console.log(`[2/2] ai-load: ${ASK_USERS} Ask AI answers at once + GET /subjects...`);
  const conversations = await Promise.all(
    Array.from({ length: ASK_USERS }, (_, i) => createConversation(token, i)),
  );
  let asking = true;
  const lightDuringAi = runLightLoad(token, () => !asking);
  const answers = await Promise.all(conversations.map((id) => askOnce(token, id)));
  asking = false;
  const aiLoad = summarize(await lightDuringAi);
  await Promise.all(conversations.map((id) => deleteConversation(token, id)));

  const report = {
    label: LABEL,
    at: new Date().toISOString(),
    settings: { BASE_URL, ASK_USERS, IDLE_SECONDS, LIGHT_CONCURRENCY, QUESTION },
    light: { idle, aiLoad },
    answers,
  };

  console.log("\nGET /subjects latency (ms)");
  console.table({ idle, "during Ask AI": aiLoad });
  console.log("Ask AI answers");
  console.table(
    answers.map((a, i) => ({
      user: i + 1,
      ok: a.ok,
      provider: a.provider,
      firstTokenMs: a.firstTokenMs,
      totalMs: a.totalMs,
      resets: a.resets,
      error: a.error,
    })),
  );

  const dir = join(dirname(fileURLToPath(import.meta.url)), "results");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${LABEL}-${report.at.replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify(report, null, 2));
  console.log(`\nSaved: ${file}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
