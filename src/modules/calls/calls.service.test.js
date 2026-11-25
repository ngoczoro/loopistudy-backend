import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import ApiError from "../../utils/ApiError.js";
import { createCallsService } from "./calls.service.js";

const GROUP_ID = "6f1c2d3e-4b5a-4c6d-8e7f-901234567890";
const ROOM = `group-${GROUP_ID}`;
const START = Date.parse("2026-11-25T08:00:00.000Z");
const HOUR = 60 * 60 * 1000;

const PRIMARY = { id: "primary", url: "wss://rtc.azure.example", apiUrl: "https://rtc.azure.example" };
const FALLBACK = { id: "fallback", url: "wss://loopi.livekit.cloud", apiUrl: "https://loopi.livekit.cloud" };

const participant = (identity, extra = {}) => ({
  identity,
  name: `User ${identity}`,
  metadata: JSON.stringify({ avatarUrl: `https://img/${identity}.png` }),
  joinedAt: 1_700_000_000n,
  state: 2,
  ...extra,
});

const room = (name, numParticipants) => ({ name, numParticipants });

const fakeClient = ({ rooms = [], participants = [], down = false } = {}) => {
  const fail = async () => {
    throw new Error("ECONNREFUSED");
  };
  return {
    listRooms: jest.fn(down ? fail : async () => rooms),
    ensureRoom: jest.fn(down ? fail : async () => ({})),
    listParticipants: jest.fn(down ? fail : async () => participants),
    createToken: jest.fn(async ({ identity }) => `token-for-${identity}`),
    receiveWebhook: jest.fn(async () => {
      throw new Error("bad signature");
    }),
  };
};

const fakeMeetStore = (clock, initial = {}) => {
  let row = {
    id: GROUP_ID,
    backupMeetUrl: null,
    activeMeetUrl: null,
    activeMeetBy: null,
    activeMeetAt: null,
    ...initial,
  };
  return {
    findGroupMeet: jest.fn(async () => row),
    claimActiveMeet: jest.fn(async (_groupId, { url, userId, expiredBefore }) => {
      if (row.activeMeetUrl && row.activeMeetAt >= expiredBefore) return false;
      row = { ...row, activeMeetUrl: url, activeMeetBy: userId, activeMeetAt: new Date(clock.now) };
      return true;
    }),
    clearActiveMeet: jest.fn(async () => {
      row = { ...row, activeMeetUrl: null, activeMeetBy: null, activeMeetAt: null };
    }),
  };
};

const setup = ({
  servers = [PRIMARY],
  clients = {},
  config = {},
  meetRow = {},
  meetConfigured = true,
  membership,
} = {}) => {
  const clock = { now: START };
  const clientById = {
    primary: clients.primary ?? fakeClient(),
    fallback: clients.fallback ?? fakeClient(),
  };
  const meetClient = { createSpace: jest.fn(async () => "https://meet.google.com/abc-defg-hij") };
  const meetStore = fakeMeetStore(clock, meetRow);
  const emit = jest.fn();
  const postChatMessage = jest.fn(async () => ({}));
  const sessions = { scheduleStartCheck: jest.fn(), confirmStart: jest.fn(async () => false) };
  const service = createCallsService({
    getConfig: () => ({
      configured: servers.length > 0,
      servers,
      maxParticipants: 2,
      maxRooms: null,
      maxTotalParticipants: null,
      tokenTtl: "2h",
      emptyTimeoutSeconds: 300,
      meet: { configured: meetConfigured, clientId: "id", clientSecret: "s", refreshToken: "r" },
      ...config,
    }),
    getClient: (server) => clientById[server.id],
    getMembership: membership ?? jest.fn(async () => ({ role: "member" })),
    findUser: jest.fn(async (id) => ({ id, fullName: "Như Quỳnh", avatarUrl: "https://img/me.png" })),
    emit,
    meetStore,
    getMeetClient: () => meetClient,
    postChatMessage,
    sessions,
    now: () => clock.now,
    logger: { error: jest.fn() },
  });
  return { service, clients: clientById, meetClient, meetStore, emit, postChatMessage, sessions, clock };
};

const expectCallError = async (promise, statusCode, code) => {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.statusCode).toBe(statusCode);
  if (code) expect(error.code).toBe(code);
  return error;
};

const forbidden = () =>
  jest.fn(async () => {
    throw ApiError.forbidden("Bạn không phải thành viên nhóm này.");
  });

describe("issueToken", () => {
  it("rejects a user who is not in the group, before touching LiveKit", async () => {
    const { service, clients } = setup({ membership: forbidden() });
    await expectCallError(service.issueToken("u1", GROUP_ID), 403);
    expect(clients.primary.listRooms).not.toHaveBeenCalled();
  });

  it("returns 404 when the group does not exist", async () => {
    const { service } = setup({
      membership: jest.fn(async () => {
        throw ApiError.notFound("Không tìm thấy nhóm.");
      }),
    });
    await expectCallError(service.issueToken("u1", GROUP_ID), 404);
  });

  it("returns 503 with a Meet fallback when no server is configured", async () => {
    const { service } = setup({
      servers: [],
      meetRow: { backupMeetUrl: "https://meet.google.com/bak-kupl-ink" },
    });
    const error = await expectCallError(service.issueToken("u1", GROUP_ID), 503, "CALL_NOT_CONFIGURED");
    expect(error.details.fallback).toEqual({
      meetUrl: null,
      backupMeetUrl: "https://meet.google.com/bak-kupl-ink",
    });
  });

  it("creates the room on the main server and signs a token", async () => {
    const { service, clients } = setup();

    const result = await service.issueToken("u1", GROUP_ID);

    expect(clients.primary.ensureRoom).toHaveBeenCalledWith(ROOM, {
      maxParticipants: 2,
      emptyTimeout: 300,
    });
    expect(clients.primary.createToken).toHaveBeenCalledWith({
      identity: "u1",
      name: "Như Quỳnh",
      metadata: JSON.stringify({ avatarUrl: "https://img/me.png" }),
      roomName: ROOM,
      ttl: "2h",
    });
    expect(result).toEqual({
      token: "token-for-u1",
      url: PRIMARY.url,
      roomName: ROOM,
      maxParticipants: 2,
      server: "primary",
    });
  });

  it("returns 409 when the group's room is full, without offering Meet", async () => {
    const { service, clients } = setup({
      clients: { primary: fakeClient({ participants: [participant("a"), participant("b")] }) },
    });
    const error = await expectCallError(service.issueToken("u1", GROUP_ID), 409, "CALL_ROOM_FULL");
    expect(error.message).toContain("2 người");
    expect(error.details).toBeUndefined();
    expect(clients.primary.createToken).not.toHaveBeenCalled();
  });

  it("asks for a start check only when the room was empty", async () => {
    const empty = setup();
    await empty.service.issueToken("u1", GROUP_ID);
    expect(empty.sessions.scheduleStartCheck).toHaveBeenCalledWith(GROUP_ID);

    const busy = setup({ clients: { primary: fakeClient({ participants: [participant("a")] }) } });
    await busy.service.issueToken("u1", GROUP_ID);
    expect(busy.sessions.scheduleStartCheck).not.toHaveBeenCalled();
  });

  it("lets a member rejoin a full room from another tab", async () => {
    const { service } = setup({
      clients: { primary: fakeClient({ participants: [participant("a"), participant("u1")] }) },
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ server: "primary" });
  });

  it("does not count hidden or disconnected participants", async () => {
    const { service } = setup({
      clients: {
        primary: fakeClient({
          participants: [
            participant("a"),
            participant("recorder", { permission: { hidden: true } }),
            participant("gone", { state: 3 }),
          ],
        }),
      },
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ server: "primary" });
  });

  it("moves to the fallback server when the main one is down", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      clients: { primary: fakeClient({ down: true }) },
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({
      server: "fallback",
      url: FALLBACK.url,
    });
  });

  it("moves to the fallback server when the main one has too many rooms", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      config: { maxRooms: 1 },
      clients: { primary: fakeClient({ rooms: [room("group-other", 3)] }) },
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ server: "fallback" });
  });

  it("moves to the fallback server when the main one has too many people", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      config: { maxTotalParticipants: 5 },
      clients: { primary: fakeClient({ rooms: [room("group-a", 3), room("group-b", 2)] }) },
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ server: "fallback" });
  });

  it("keeps a group that is already in a call on its server, even over the limits", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      config: { maxRooms: 0 },
      clients: { primary: fakeClient({ rooms: [room(ROOM, 1)], participants: [participant("a")] }) },
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ server: "primary" });
  });

  it("sends people to the fallback server when the group's call is there", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      clients: { fallback: fakeClient({ rooms: [room(ROOM, 2)], participants: [participant("a")] }) },
    });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ server: "fallback" });
  });

  it("tries the next server when opening the room fails", async () => {
    const primary = fakeClient();
    primary.ensureRoom.mockRejectedValueOnce(new Error("timeout"));
    const { service } = setup({ servers: [PRIMARY, FALLBACK], clients: { primary } });
    await expect(service.issueToken("u1", GROUP_ID)).resolves.toMatchObject({ server: "fallback" });
  });

  it("returns 503 CALL_CAPACITY_REACHED with the group's Meet when every server is full", async () => {
    const { service } = setup({
      config: { maxRooms: 0 },
      meetRow: { activeMeetUrl: "https://meet.google.com/act-ivem-eet", activeMeetAt: new Date(START - HOUR) },
    });
    const error = await expectCallError(service.issueToken("u1", GROUP_ID), 503, "CALL_CAPACITY_REACHED");
    expect(error.details.fallback.meetUrl).toBe("https://meet.google.com/act-ivem-eet");
  });

  it("returns 502 CALL_SERVER_UNAVAILABLE when every server is down", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      clients: { primary: fakeClient({ down: true }), fallback: fakeClient({ down: true }) },
      meetRow: { backupMeetUrl: "https://meet.google.com/bak-kupl-ink" },
    });
    const error = await expectCallError(
      service.issueToken("u1", GROUP_ID),
      502,
      "CALL_SERVER_UNAVAILABLE",
    );
    expect(error.details.fallback).toEqual({
      meetUrl: null,
      backupMeetUrl: "https://meet.google.com/bak-kupl-ink",
    });
  });
});

describe("getCallStatus", () => {
  it("merges people from every server and lists each person once", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      clients: {
        primary: fakeClient({ participants: [participant("a"), participant("hidden", { permission: { hidden: true } })] }),
        fallback: fakeClient({ participants: [participant("a"), participant("b")] }),
      },
    });

    const status = await service.getCallStatus("u1", GROUP_ID);
    expect(status).toMatchObject({ groupId: GROUP_ID, active: true, count: 2, meet: null });
    expect(status.participants.map((p) => p.userId)).toEqual(["a", "b"]);
    expect(status.participants[0]).toEqual({
      userId: "a",
      fullName: "User a",
      avatarUrl: "https://img/a.png",
      joinedAt: new Date(1_700_000_000 * 1000).toISOString(),
    });
  });

  it("still answers when one server is down", async () => {
    const { service } = setup({
      servers: [PRIMARY, FALLBACK],
      clients: { primary: fakeClient({ down: true }), fallback: fakeClient({ participants: [participant("b")] }) },
    });
    await expect(service.getCallStatus("u1", GROUP_ID)).resolves.toMatchObject({ count: 1 });
  });

  it("includes the group's active Meet", async () => {
    const { service } = setup({
      meetRow: {
        activeMeetUrl: "https://meet.google.com/act-ivem-eet",
        activeMeetBy: "u2",
        activeMeetAt: new Date(START - HOUR),
      },
    });
    const status = await service.getCallStatus("u1", GROUP_ID);
    expect(status.meet).toEqual({
      url: "https://meet.google.com/act-ivem-eet",
      startedBy: { userId: "u2", fullName: "Như Quỳnh" },
      startedAt: new Date(START - HOUR).toISOString(),
    });
  });

  it("drops a Meet older than three hours", async () => {
    const { service } = setup({
      meetRow: { activeMeetUrl: "https://meet.google.com/old-meet-ing", activeMeetAt: new Date(START - 4 * HOUR) },
    });
    await expect(service.getCallStatus("u1", GROUP_ID)).resolves.toMatchObject({ meet: null });
  });

  it("reports no call, but still the Meet, when LiveKit is not configured", async () => {
    const { service } = setup({
      servers: [],
      meetRow: { activeMeetUrl: "https://meet.google.com/act-ivem-eet", activeMeetAt: new Date(START) },
    });
    const status = await service.getCallStatus("u1", GROUP_ID);
    expect(status).toMatchObject({ active: false, count: 0 });
    expect(status.meet.url).toBe("https://meet.google.com/act-ivem-eet");
  });

  it("checks membership", async () => {
    const { service } = setup({ membership: forbidden() });
    await expectCallError(service.getCallStatus("u1", GROUP_ID), 403);
  });
});

describe("receiveWebhook", () => {
  let ctx;
  const deliverFrom = (serverId, event) => {
    ctx.clients[serverId].receiveWebhook.mockResolvedValueOnce(event);
    return ctx.service.receiveWebhook("{}", "auth");
  };

  beforeEach(() => {
    ctx = setup({
      servers: [PRIMARY, FALLBACK],
      clients: {
        primary: fakeClient({ participants: [participant("a"), participant("b")] }),
        fallback: fakeClient(),
      },
    });
  });

  it("rejects a signature no server recognises", async () => {
    await expectCallError(ctx.service.receiveWebhook("{}", "bad"), 401);
    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("accepts an event signed by the fallback server", async () => {
    await expect(
      deliverFrom("fallback", { event: "participant_joined", room: { name: ROOM } }),
    ).resolves.toEqual({ handled: true, groupId: GROUP_ID });
  });

  it("broadcasts call:status to the group when someone joins", async () => {
    await deliverFrom("primary", { event: "participant_joined", room: { name: ROOM }, participant: { identity: "b" } });

    expect(ctx.emit).toHaveBeenCalledTimes(1);
    const [target, eventName, payload] = ctx.emit.mock.calls[0];
    expect(target).toBe(`group:${GROUP_ID}`);
    expect(eventName).toBe("call:status");
    expect(payload).toMatchObject({ groupId: GROUP_ID, active: true, count: 2, meet: null });
  });

  it("checks whether the call just started when someone joins", async () => {
    await deliverFrom("primary", { event: "participant_joined", room: { name: ROOM }, participant: { identity: "b" } });
    expect(ctx.sessions.confirmStart).toHaveBeenCalledWith(GROUP_ID, { identity: "b" });

    await deliverFrom("primary", { event: "participant_left", room: { name: ROOM }, participant: { identity: "b" } });
    expect(ctx.sessions.confirmStart).toHaveBeenCalledTimes(1);
  });

  it("leaves out the person who just left", async () => {
    await deliverFrom("primary", { event: "participant_left", room: { name: ROOM }, participant: { identity: "b" } });
    expect(ctx.emit.mock.calls[0][2].participants.map((p) => p.userId)).toEqual(["a"]);
  });

  it("does not ask the server whose room just closed", async () => {
    await deliverFrom("primary", { event: "room_finished", room: { name: ROOM } });
    expect(ctx.clients.primary.listParticipants).not.toHaveBeenCalled();
    expect(ctx.emit.mock.calls[0][2]).toMatchObject({ active: false, count: 0 });
  });

  it("ignores rooms this app did not create, and unrelated events", async () => {
    await expect(deliverFrom("primary", { event: "participant_joined", room: { name: "load-test" } })).resolves.toEqual({ handled: false });
    await expect(deliverFrom("primary", { event: "track_published", room: { name: ROOM } })).resolves.toEqual({ handled: false });
    expect(ctx.emit).not.toHaveBeenCalled();
  });
});

describe("startMeet (Google Meet API)", () => {
  it("returns the group's current Meet without calling Google", async () => {
    const { service, meetClient } = setup({
      meetRow: { activeMeetUrl: "https://meet.google.com/act-ivem-eet", activeMeetAt: new Date(START) },
    });
    const result = await service.startMeet("u1", GROUP_ID);
    expect(result).toMatchObject({ created: false, meet: { url: "https://meet.google.com/act-ivem-eet" } });
    expect(meetClient.createSpace).not.toHaveBeenCalled();
  });

  it("creates a Meet, stores it, posts it to chat and tells the group", async () => {
    const { service, meetStore, postChatMessage, emit } = setup();

    const result = await service.startMeet("u1", GROUP_ID);

    expect(result).toMatchObject({ created: true, meet: { url: "https://meet.google.com/abc-defg-hij" } });
    expect(meetStore.claimActiveMeet).toHaveBeenCalledWith(GROUP_ID, {
      url: "https://meet.google.com/abc-defg-hij",
      userId: "u1",
      expiredBefore: new Date(START - 3 * HOUR),
    });
    expect(postChatMessage).toHaveBeenCalledWith("u1", GROUP_ID, expect.stringContaining("https://meet.google.com/abc-defg-hij"));
    expect(emit.mock.calls.at(-1)[2].meet.url).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("uses the Meet someone else stored first and does not post twice", async () => {
    const { service, meetStore, postChatMessage } = setup();
    meetStore.claimActiveMeet.mockResolvedValueOnce(false);
    const result = await service.startMeet("u1", GROUP_ID);
    expect(result.created).toBe(false);
    expect(postChatMessage).not.toHaveBeenCalled();
  });

  it("returns 503 MEET_AUTO_UNAVAILABLE with the standing link when the API is not set up", async () => {
    const { service } = setup({
      meetConfigured: false,
      meetRow: { backupMeetUrl: "https://meet.google.com/bak-kupl-ink" },
    });
    const error = await expectCallError(service.startMeet("u1", GROUP_ID), 503, "MEET_AUTO_UNAVAILABLE");
    expect(error.details.fallback).toEqual({ backupMeetUrl: "https://meet.google.com/bak-kupl-ink" });
  });

  it("returns 503 MEET_AUTO_UNAVAILABLE when Google fails", async () => {
    const { service, meetClient } = setup();
    meetClient.createSpace.mockRejectedValueOnce(new Error("invalid_grant"));
    await expectCallError(service.startMeet("u1", GROUP_ID), 503, "MEET_AUTO_UNAVAILABLE");
  });

  it("creates at most one Meet per group per minute", async () => {
    const { service, clock } = setup();
    await service.startMeet("u1", GROUP_ID);
    await service.endMeet("u1", GROUP_ID);
    clock.now += 30 * 1000;
    await expectCallError(service.startMeet("u1", GROUP_ID), 429, "MEET_RATE_LIMITED");
    clock.now += 31 * 1000;
    await expect(service.startMeet("u1", GROUP_ID)).resolves.toMatchObject({ created: true });
  });

  it("checks membership", async () => {
    const { service } = setup({ membership: forbidden() });
    await expectCallError(service.startMeet("u1", GROUP_ID), 403);
  });
});

describe("shareMeet and endMeet", () => {
  it("rejects a link that is not Google Meet", async () => {
    const { service, meetStore } = setup();
    await expectCallError(service.shareMeet("u1", GROUP_ID, "https://evil.com/abc-defg-hij"), 400, "MEET_INVALID_URL");
    await expectCallError(service.shareMeet("u1", GROUP_ID, "https://meet.google.com.evil.com/abc-defg-hij"), 400, "MEET_INVALID_URL");
    expect(meetStore.claimActiveMeet).not.toHaveBeenCalled();
  });

  it("stores a pasted link in its canonical form", async () => {
    const { service, meetStore } = setup();
    await service.shareMeet("u1", GROUP_ID, " meet.google.com/ABC-DEFG-HIJ?authuser=1 ");
    expect(meetStore.claimActiveMeet.mock.calls[0][1].url).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("ends the Meet and tells the group", async () => {
    const { service, emit } = setup({
      meetRow: { activeMeetUrl: "https://meet.google.com/act-ivem-eet", activeMeetAt: new Date(START) },
    });
    const status = await service.endMeet("u1", GROUP_ID);
    expect(status.meet).toBeNull();
    expect(emit.mock.calls.at(-1)[2].meet).toBeNull();
  });

  it("checks membership", async () => {
    const { service } = setup({ membership: forbidden() });
    await expectCallError(service.shareMeet("u1", GROUP_ID, "https://meet.google.com/abc-defg-hij"), 403);
    await expectCallError(service.endMeet("u1", GROUP_ID), 403);
  });
});
