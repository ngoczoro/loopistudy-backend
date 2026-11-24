import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import ApiError from "../../utils/ApiError.js";
import { createCallsService } from "./calls.service.js";

const GROUP_ID = "6f1c2d3e-4b5a-4c6d-8e7f-901234567890";
const ROOM = `group-${GROUP_ID}`;

const baseConfig = {
  configured: true,
  url: "wss://loopi-test.livekit.cloud",
  apiUrl: "https://loopi-test.livekit.cloud",
  apiKey: "key",
  apiSecret: "secret",
  maxParticipants: 2,
  tokenTtl: "2h",
  emptyTimeoutSeconds: 300,
};

const participant = (identity, extra = {}) => ({
  identity,
  name: `User ${identity}`,
  metadata: JSON.stringify({ avatarUrl: `https://img/${identity}.png` }),
  joinedAt: 1_700_000_000n,
  state: 2,
  ...extra,
});

const setup = ({ config = baseConfig, participants = [], membership } = {}) => {
  const client = {
    ensureRoom: jest.fn(async () => ({})),
    listParticipants: jest.fn(async () => participants),
    createToken: jest.fn(async () => "signed-token"),
    receiveWebhook: jest.fn(),
  };
  const emit = jest.fn();
  const service = createCallsService({
    getConfig: () => config,
    getClient: () => client,
    getMembership: membership ?? jest.fn(async () => ({ role: "member" })),
    findUser: jest.fn(async (id) => ({ id, fullName: "Như Quỳnh", avatarUrl: "https://img/me.png" })),
    emit,
    logger: { error: jest.fn() },
  });
  return { service, client, emit };
};

const expectApiError = async (promise, statusCode) => {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.statusCode).toBe(statusCode);
  return error;
};

describe("callsService.issueToken", () => {
  it("rejects a user who is not in the group, before touching LiveKit", async () => {
    const { service, client } = setup({
      membership: jest.fn(async () => {
        throw ApiError.forbidden("Bạn không phải thành viên nhóm này.");
      }),
    });

    await expectApiError(service.issueToken("u1", GROUP_ID), 403);
    expect(client.ensureRoom).not.toHaveBeenCalled();
    expect(client.createToken).not.toHaveBeenCalled();
  });

  it("returns 404 when the group does not exist", async () => {
    const { service } = setup({
      membership: jest.fn(async () => {
        throw ApiError.notFound("Không tìm thấy nhóm.");
      }),
    });
    await expectApiError(service.issueToken("u1", GROUP_ID), 404);
  });

  it("returns 503 when LiveKit is not configured", async () => {
    const { service } = setup({ config: { ...baseConfig, configured: false } });
    await expectApiError(service.issueToken("u1", GROUP_ID), 503);
  });

  it("creates the group room and signs a token for the caller", async () => {
    const { service, client } = setup();

    const result = await service.issueToken("u1", GROUP_ID);

    expect(client.ensureRoom).toHaveBeenCalledWith(ROOM, {
      maxParticipants: 2,
      emptyTimeout: 300,
    });
    expect(client.createToken).toHaveBeenCalledWith({
      identity: "u1",
      name: "Như Quỳnh",
      metadata: JSON.stringify({ avatarUrl: "https://img/me.png" }),
      roomName: ROOM,
      ttl: "2h",
    });
    expect(result).toEqual({
      token: "signed-token",
      url: "wss://loopi-test.livekit.cloud",
      roomName: ROOM,
      maxParticipants: 2,
    });
  });

  it("returns 409 when the room is full", async () => {
    const { service, client } = setup({ participants: [participant("a"), participant("b")] });

    const error = await expectApiError(service.issueToken("u1", GROUP_ID), 409);
    expect(error.message).toContain("2 người");
    expect(client.createToken).not.toHaveBeenCalled();
  });

  it("lets a member rejoin a full room from another tab", async () => {
    const { service } = setup({ participants: [participant("a"), participant("u1")] });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ token: "signed-token" });
  });

  it("does not count hidden or disconnected participants", async () => {
    const { service } = setup({
      participants: [
        participant("a"),
        participant("recorder", { permission: { hidden: true } }),
        participant("gone", { state: 3 }),
      ],
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ token: "signed-token" });
  });

  it("returns 502 when LiveKit cannot be reached", async () => {
    const { service, client } = setup();
    client.ensureRoom.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expectApiError(service.issueToken("u1", GROUP_ID), 502);
  });
});

describe("callsService.getCallStatus", () => {
  it("lists who is in the call", async () => {
    const { service } = setup({
      participants: [participant("a"), participant("hidden", { permission: { hidden: true } })],
    });

    await expect(service.getCallStatus("u1", GROUP_ID)).resolves.toEqual({
      groupId: GROUP_ID,
      active: true,
      count: 1,
      participants: [
        {
          userId: "a",
          fullName: "User a",
          avatarUrl: "https://img/a.png",
          joinedAt: new Date(1_700_000_000 * 1000).toISOString(),
        },
      ],
    });
  });

  it("reports no call when the room is empty", async () => {
    const { service } = setup();
    await expect(service.getCallStatus("u1", GROUP_ID)).resolves.toEqual({
      groupId: GROUP_ID,
      active: false,
      count: 0,
      participants: [],
    });
  });

  it("checks membership", async () => {
    const { service } = setup({
      membership: jest.fn(async () => {
        throw ApiError.forbidden();
      }),
    });
    await expectApiError(service.getCallStatus("u1", GROUP_ID), 403);
  });
});

describe("callsService.receiveWebhook", () => {
  let ctx;
  const deliver = (event) => {
    ctx.client.receiveWebhook.mockResolvedValueOnce(event);
    return ctx.service.receiveWebhook("{}", "auth");
  };

  beforeEach(() => {
    ctx = setup({ participants: [participant("a"), participant("b")] });
  });

  it("rejects a bad signature with 401", async () => {
    ctx.client.receiveWebhook.mockRejectedValueOnce(new Error("sha256 checksum of body does not match"));
    await expectApiError(ctx.service.receiveWebhook("{}", "bad"), 401);
    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("broadcasts call:status to the group room when someone joins", async () => {
    await expect(
      deliver({ event: "participant_joined", room: { name: ROOM }, participant: { identity: "b" } }),
    ).resolves.toEqual({ handled: true, groupId: GROUP_ID });

    expect(ctx.emit).toHaveBeenCalledTimes(1);
    const [room, eventName, payload] = ctx.emit.mock.calls[0];
    expect(room).toBe(`group:${GROUP_ID}`);
    expect(eventName).toBe("call:status");
    expect(payload).toMatchObject({ groupId: GROUP_ID, active: true, count: 2 });
  });

  it("leaves out the person who just left", async () => {
    await deliver({ event: "participant_left", room: { name: ROOM }, participant: { identity: "b" } });

    const payload = ctx.emit.mock.calls[0][2];
    expect(payload.count).toBe(1);
    expect(payload.participants.map((p) => p.userId)).toEqual(["a"]);
  });

  it("reports the call as ended when the room closes", async () => {
    await deliver({ event: "room_finished", room: { name: ROOM } });

    expect(ctx.client.listParticipants).not.toHaveBeenCalled();
    expect(ctx.emit.mock.calls[0][2]).toEqual({
      groupId: GROUP_ID,
      active: false,
      count: 0,
      participants: [],
    });
  });

  it("ignores rooms this app did not create", async () => {
    await expect(
      deliver({ event: "participant_joined", room: { name: "load-test-room" } }),
    ).resolves.toEqual({ handled: false });
    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("ignores events that do not change who is in the call", async () => {
    await expect(deliver({ event: "track_published", room: { name: ROOM } })).resolves.toEqual({
      handled: false,
    });
    expect(ctx.emit).not.toHaveBeenCalled();
  });
});
