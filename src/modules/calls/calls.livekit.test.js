import { describe, expect, it } from "@jest/globals";
import jwt from "jsonwebtoken";
import { readCallsConfig } from "./calls.config.js";
import { createLivekitClient } from "./calls.livekit.js";
import { groupIdFromRoomName, roomNameForGroup } from "./calls.constants.js";
import { signWebhook, TEST_LIVEKIT_ENV } from "./calls.testUtils.js";

const config = readCallsConfig(TEST_LIVEKIT_ENV);

describe("readCallsConfig", () => {
  it("is not configured until url, key and secret are set", () => {
    expect(readCallsConfig({}).configured).toBe(false);
    expect(readCallsConfig({ LIVEKIT_URL: "wss://x", LIVEKIT_API_KEY: "k" }).configured).toBe(false);
    expect(config.configured).toBe(true);
  });

  it("uses https for the room API and keeps wss for clients", () => {
    expect(config.url).toBe("wss://loopi-test.livekit.cloud");
    expect(config.apiUrl).toBe("https://loopi-test.livekit.cloud");
    expect(readCallsConfig({ LIVEKIT_URL: "ws://localhost:7880" }).apiUrl).toBe("http://localhost:7880");
  });

  it("falls back to defaults for missing or invalid limits", () => {
    expect(config.maxParticipants).toBe(25);
    expect(config.tokenTtl).toBe("2h");
    expect(readCallsConfig({ CALL_MAX_PARTICIPANTS: "abc" }).maxParticipants).toBe(25);
    expect(readCallsConfig({ CALL_MAX_PARTICIPANTS: "10" }).maxParticipants).toBe(10);
  });
});

describe("room names", () => {
  it("round-trips a group id", () => {
    const groupId = "6f1c2d3e-4b5a-4c6d-8e7f-901234567890";
    expect(groupIdFromRoomName(roomNameForGroup(groupId))).toBe(groupId);
  });

  it("rejects rooms that are not group rooms", () => {
    expect(groupIdFromRoomName("load-test")).toBeNull();
    expect(groupIdFromRoomName("group-not-a-uuid")).toBeNull();
    expect(groupIdFromRoomName(undefined)).toBeNull();
  });
});

describe("createLivekitClient", () => {
  const client = createLivekitClient(config);

  it("signs a token that only opens the group's room", async () => {
    const token = await client.createToken({
      identity: "user-1",
      name: "Như Quỳnh",
      metadata: JSON.stringify({ avatarUrl: null }),
      roomName: "group-abc",
      ttl: "2h",
    });

    const claims = jwt.verify(token, config.apiSecret);
    expect(claims.iss).toBe(config.apiKey);
    expect(claims.sub).toBe("user-1");
    expect(claims.name).toBe("Như Quỳnh");
    expect(claims.metadata).toBe(JSON.stringify({ avatarUrl: null }));
    expect(claims.video).toMatchObject({
      room: "group-abc",
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    expect(claims.video.roomAdmin).toBeUndefined();
    expect(claims.exp - claims.nbf).toBe(2 * 60 * 60);
  });

  it("accepts a correctly signed webhook", async () => {
    const body = JSON.stringify({ event: "room_finished", room: { name: "group-abc" } });
    const event = await client.receiveWebhook(body, await signWebhook(body));
    expect(event.event).toBe("room_finished");
    expect(event.room.name).toBe("group-abc");
  });

  it("rejects a webhook whose body was changed", async () => {
    const body = JSON.stringify({ event: "room_finished", room: { name: "group-abc" } });
    const auth = await signWebhook(body);
    await expect(client.receiveWebhook(body.replace("abc", "xyz"), auth)).rejects.toThrow();
  });

  it("rejects a webhook signed with another secret", async () => {
    const body = JSON.stringify({ event: "room_finished", room: { name: "group-abc" } });
    const auth = await signWebhook(body, {
      apiKey: config.apiKey,
      apiSecret: "another-secret-that-is-long-enough-xx",
    });
    await expect(client.receiveWebhook(body, auth)).rejects.toThrow();
  });
});
