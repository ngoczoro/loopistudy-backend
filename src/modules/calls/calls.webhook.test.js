import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import sequelize from "../../config/database.js";
import { signWebhook, TEST_LIVEKIT_ENV as KEYS } from "./calls.testUtils.js";
import { LIVEKIT_WEBHOOK_PATH } from "./calls.webhook.js";

const GROUP_ID = "6f1c2d3e-4b5a-4c6d-8e7f-901234567890";

// The webhook reads the group's Meet from the database; close the pool so Jest can exit.
afterAll(async () => {
  await sequelize.close().catch(() => {});
});

/**
 * Runs against the real app so it also proves the webhook is mounted before
 * express.json(): a parsed body would no longer match the signature.
 */
describe("POST /api/v1/calls/livekit-webhook", () => {
  let app;
  const saved = {};

  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    ({ default: app } = await import("../../app.js"));
    for (const [key, value] of Object.entries(KEYS)) {
      saved[key] = process.env[key];
      process.env[key] = value;
    }
  });

  afterAll(() => {
    for (const key of Object.keys(KEYS)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    jest.restoreAllMocks();
  });

  const send = (body, auth) => {
    const req = request(app)
      .post(LIVEKIT_WEBHOOK_PATH)
      .set("Content-Type", "application/webhook+json");
    if (auth) req.set("Authorization", auth);
    return req.send(body);
  };

  it("accepts a signed event", async () => {
    const body = JSON.stringify({ event: "room_finished", room: { name: `group-${GROUP_ID}` } });
    const res = await send(body, await signWebhook(body));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ handled: true, groupId: GROUP_ID });
  });

  it("rejects a request without a signature", async () => {
    const res = await send(JSON.stringify({ event: "room_finished" }));
    expect(res.status).toBe(401);
  });

  it("rejects a forged signature", async () => {
    const body = JSON.stringify({ event: "room_finished", room: { name: `group-${GROUP_ID}` } });
    const forged = await signWebhook(body, {
      apiKey: KEYS.LIVEKIT_API_KEY,
      apiSecret: "attacker-secret-that-is-long-enough-x",
    });
    const res = await send(body, forged);
    expect(res.status).toBe(401);
  });

  it("returns 503 when LiveKit is not configured", async () => {
    // Neither the main server nor a fallback one (a local .env may set both).
    const names = ["LIVEKIT_API_SECRET", "LIVEKIT_FALLBACK_API_SECRET"];
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    names.forEach((name) => delete process.env[name]);
    try {
      const res = await send("{}");
      expect(res.status).toBe(503);
    } finally {
      names.forEach((name) => {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      });
    }
  });
});

describe("GET/POST /api/v1/groups/:groupId/call", () => {
  let app;

  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    ({ default: app } = await import("../../app.js"));
  });

  afterAll(() => jest.restoreAllMocks());

  it("requires login", async () => {
    const res = await request(app).post(`/api/v1/groups/${GROUP_ID}/call/token`);
    expect(res.status).toBe(401);
  });
});
