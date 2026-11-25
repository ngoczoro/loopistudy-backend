import { describe, expect, it, jest } from "@jest/globals";
import { createCallSessions, formatCallDuration } from "./calls.sessions.js";

const GROUP_ID = "6f1c2d3e-4b5a-4c6d-8e7f-901234567890";
const OTHER_GROUP_ID = "7a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d";
const ROOM = `group-${GROUP_ID}`;
const STARTER = "11111111-1111-4111-8111-111111111111";
const MEMBER = "22222222-2222-4222-8222-222222222222";
const MUTED = "33333333-3333-4333-8333-333333333333";
const START = Date.parse("2026-11-25T08:00:00.000Z");
const MINUTE = 60 * 1000;

const PRIMARY = { id: "primary" };
const FALLBACK = { id: "fallback" };

const participant = (identity, joinedAt = 1_700_000_000n) => ({ identity, joinedAt, state: 2 });

const fakeClient = ({ rooms = [], participants = [], down = false } = {}) => {
  const fail = async () => {
    throw new Error("ECONNREFUSED");
  };
  const client = {
    rooms,
    participants,
    listRooms: jest.fn(down ? fail : async () => client.rooms),
    listParticipants: jest.fn(down ? fail : async () => client.participants),
  };
  return client;
};

const fakeStore = (initial = {}) => {
  const rows = new Map([
    [GROUP_ID, { id: GROUP_ID, name: "SE345", callStartedAt: null, callStartedBy: null, ...initial }],
    [OTHER_GROUP_ID, { id: OTHER_GROUP_ID, name: "Other", callStartedAt: null, callStartedBy: null }],
  ]);
  return {
    rows,
    findCallState: jest.fn(async (groupId) => rows.get(groupId) ?? null),
    findActiveCalls: jest.fn(async () => [...rows.values()].filter((row) => row.callStartedAt)),
    claimCallStart: jest.fn(async (groupId, { userId, startedAt }) => {
      const row = rows.get(groupId);
      if (!row || row.callStartedAt) return false;
      rows.set(groupId, { ...row, callStartedAt: startedAt, callStartedBy: userId });
      return true;
    }),
    clearCallStart: jest.fn(async (groupId, startedAt) => {
      const row = rows.get(groupId);
      if (!row?.callStartedAt || row.callStartedAt.getTime() !== new Date(startedAt).getTime()) {
        return false;
      }
      rows.set(groupId, { ...row, callStartedAt: null, callStartedBy: null });
      return true;
    }),
    findCallRecipients: jest.fn(async () => [
      { userId: STARTER, muted: false },
      { userId: MEMBER, muted: false },
      { userId: MUTED, muted: true },
    ]),
  };
};

const setup = ({ servers = [PRIMARY], clients = {}, row = {}, configured = true } = {}) => {
  const clock = { now: START };
  const clientById = {
    primary: clients.primary ?? fakeClient(),
    fallback: clients.fallback ?? fakeClient(),
  };
  const store = fakeStore(row);
  const emit = jest.fn();
  const postChatMessage = jest.fn(async () => ({}));
  const timers = [];
  const sessions = createCallSessions({
    getConfig: () => ({ configured, servers }),
    getClient: (server) => clientById[server.id],
    store,
    findUser: jest.fn(async (id) => ({ id, fullName: "Như Quỳnh" })),
    emit,
    postChatMessage,
    now: () => clock.now,
    setTimer: (fn, ms) => timers.push({ fn, ms }),
    logger: { error: jest.fn() },
  });
  return { sessions, clients: clientById, store, emit, postChatMessage, timers, clock };
};

const eventsNamed = (emit, name) => emit.mock.calls.filter(([, event]) => event === name);

describe("formatCallDuration", () => {
  it("rounds down to minutes and shows hours past 60", () => {
    expect(formatCallDuration(20 * 1000)).toBe("less than a minute");
    expect(formatCallDuration(23 * MINUTE + 50 * 1000)).toBe("23 min");
    expect(formatCallDuration(60 * MINUTE)).toBe("1 h");
    expect(formatCallDuration(65 * MINUTE)).toBe("1 h 5 min");
  });
});

describe("confirmStart", () => {
  it("records the call, posts to chat and tells every member", async () => {
    const ctx = setup({
      clients: { primary: fakeClient({ participants: [participant(STARTER)] }) },
    });

    await expect(ctx.sessions.confirmStart(GROUP_ID)).resolves.toBe(true);

    expect(ctx.store.rows.get(GROUP_ID)).toMatchObject({
      callStartedAt: new Date(START),
      callStartedBy: STARTER,
    });
    expect(ctx.postChatMessage).toHaveBeenCalledWith(
      STARTER,
      GROUP_ID,
      expect.stringContaining("Started a group call"),
    );

    const started = eventsNamed(ctx.emit, "call:started");
    expect(started.map(([room]) => room)).toEqual([
      `user:${STARTER}`,
      `user:${MEMBER}`,
      `user:${MUTED}`,
    ]);
    expect(started[1][2]).toEqual({
      groupId: GROUP_ID,
      groupName: "SE345",
      startedBy: { userId: STARTER, fullName: "Như Quỳnh" },
      startedAt: new Date(START).toISOString(),
      notify: true,
    });
  });

  it("does not toast the person who started or members who muted the group", async () => {
    const ctx = setup({
      clients: { primary: fakeClient({ participants: [participant(STARTER)] }) },
    });
    await ctx.sessions.confirmStart(GROUP_ID);

    const notify = Object.fromEntries(
      eventsNamed(ctx.emit, "call:started").map(([room, , payload]) => [room, payload.notify]),
    );
    expect(notify).toEqual({
      [`user:${STARTER}`]: false,
      [`user:${MEMBER}`]: true,
      [`user:${MUTED}`]: false,
    });
  });

  it("announces a call only once", async () => {
    const ctx = setup({
      clients: { primary: fakeClient({ participants: [participant(STARTER)] }) },
    });
    await ctx.sessions.confirmStart(GROUP_ID);
    await expect(ctx.sessions.confirmStart(GROUP_ID)).resolves.toBe(false);
    expect(ctx.postChatMessage).toHaveBeenCalledTimes(1);
  });

  it("does nothing when nobody actually connected", async () => {
    const ctx = setup();
    await expect(ctx.sessions.confirmStart(GROUP_ID)).resolves.toBe(false);
    expect(ctx.store.claimCallStart).not.toHaveBeenCalled();
    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("credits whoever joined first, or the person named by the webhook", async () => {
    const people = [participant(MEMBER, 1_700_000_100n), participant(STARTER, 1_700_000_000n)];
    const first = setup({ clients: { primary: fakeClient({ participants: people }) } });
    await first.sessions.confirmStart(GROUP_ID);
    expect(first.store.rows.get(GROUP_ID).callStartedBy).toBe(STARTER);

    const named = setup({ clients: { primary: fakeClient({ participants: people }) } });
    await named.sessions.confirmStart(GROUP_ID, { identity: MEMBER });
    expect(named.store.rows.get(GROUP_ID).callStartedBy).toBe(MEMBER);
  });

  it("finds people on the fallback server too", async () => {
    const ctx = setup({
      servers: [PRIMARY, FALLBACK],
      clients: {
        primary: fakeClient({ down: true }),
        fallback: fakeClient({ participants: [participant(STARTER)] }),
      },
    });
    await expect(ctx.sessions.confirmStart(GROUP_ID)).resolves.toBe(true);
  });

  it("records a call started by a non-user identity without posting to chat", async () => {
    const ctx = setup({
      clients: { primary: fakeClient({ participants: [participant("load-tester-1")] }) },
    });
    await expect(ctx.sessions.confirmStart(GROUP_ID)).resolves.toBe(true);
    expect(ctx.store.rows.get(GROUP_ID).callStartedBy).toBeNull();
    expect(ctx.postChatMessage).not.toHaveBeenCalled();
    expect(eventsNamed(ctx.emit, "call:started")[0][2].startedBy).toBeNull();
  });

  it("still tells the group when the chat message fails", async () => {
    const ctx = setup({
      clients: { primary: fakeClient({ participants: [participant(STARTER)] }) },
    });
    ctx.postChatMessage.mockRejectedValueOnce(new Error("db down"));
    await expect(ctx.sessions.confirmStart(GROUP_ID)).resolves.toBe(true);
    expect(eventsNamed(ctx.emit, "call:started")).toHaveLength(3);
  });

  it("does nothing when calls are not configured", async () => {
    const ctx = setup({ configured: false });
    await expect(ctx.sessions.confirmStart(GROUP_ID)).resolves.toBe(false);
    expect(ctx.store.findCallState).not.toHaveBeenCalled();
  });
});

describe("scheduleStartCheck", () => {
  it("checks a few seconds later, once the person has connected", async () => {
    const ctx = setup();
    ctx.sessions.scheduleStartCheck(GROUP_ID);
    expect(ctx.timers).toHaveLength(1);
    expect(ctx.timers[0].ms).toBe(6000);

    ctx.clients.primary.participants = [participant(STARTER)];
    await ctx.timers[0].fn();
    expect(ctx.store.rows.get(GROUP_ID).callStartedBy).toBe(STARTER);
  });
});

describe("sweep", () => {
  const busyRoom = (name = ROOM) => ({ name, numParticipants: 2 });

  it("announces a call that no check or webhook noticed", async () => {
    const ctx = setup({
      clients: {
        primary: fakeClient({
          rooms: [busyRoom(), { name: "load-test", numParticipants: 5 }],
          participants: [participant(STARTER)],
        }),
      },
    });
    await ctx.sessions.sweep();
    expect(ctx.store.rows.get(GROUP_ID).callStartedBy).toBe(STARTER);
    expect(ctx.store.claimCallStart).toHaveBeenCalledTimes(1);
  });

  it("ends a call whose room stayed empty past the grace time, with its duration", async () => {
    const ctx = setup({
      row: { callStartedAt: new Date(START), callStartedBy: STARTER },
    });

    ctx.clock.now = START + 23 * MINUTE;
    await ctx.sessions.sweep();
    expect(ctx.store.rows.get(GROUP_ID).callStartedAt).not.toBeNull();

    ctx.clock.now += 20 * 1000;
    await ctx.sessions.sweep();
    expect(ctx.store.rows.get(GROUP_ID).callStartedAt).not.toBeNull();

    ctx.clock.now += 20 * 1000;
    await ctx.sessions.sweep();
    expect(ctx.store.rows.get(GROUP_ID).callStartedAt).toBeNull();

    // Measured until the room was first seen empty, not until the grace time ran out.
    expect(ctx.postChatMessage).toHaveBeenCalledWith(STARTER, GROUP_ID, "📹 Call ended · 23 min");
    const ended = eventsNamed(ctx.emit, "call:ended");
    expect(ended).toHaveLength(3);
    expect(ended[0][2]).toMatchObject({ groupId: GROUP_ID, durationMs: 23 * MINUTE, notify: false });
  });

  it("keeps the call going when someone reconnects within the grace time", async () => {
    const primary = fakeClient();
    const ctx = setup({
      clients: { primary },
      row: { callStartedAt: new Date(START), callStartedBy: STARTER },
    });

    await ctx.sessions.sweep();
    primary.rooms = [busyRoom()];
    ctx.clock.now += 20 * 1000;
    await ctx.sessions.sweep();
    primary.rooms = [];
    ctx.clock.now += 30 * 1000;
    await ctx.sessions.sweep();

    expect(ctx.store.clearCallStart).not.toHaveBeenCalled();
    expect(ctx.postChatMessage).not.toHaveBeenCalled();
  });

  it("never ends a call while a server is unreachable", async () => {
    const ctx = setup({
      servers: [PRIMARY, FALLBACK],
      clients: { primary: fakeClient(), fallback: fakeClient({ down: true }) },
      row: { callStartedAt: new Date(START), callStartedBy: STARTER },
    });

    for (let i = 0; i < 5; i += 1) {
      await ctx.sessions.sweep();
      ctx.clock.now += 20 * 1000;
    }
    expect(ctx.store.clearCallStart).not.toHaveBeenCalled();
  });

  it("does not report a call twice when it was already ended elsewhere", async () => {
    const ctx = setup({
      row: { callStartedAt: new Date(START), callStartedBy: STARTER },
    });
    await ctx.sessions.sweep();
    ctx.store.rows.set(GROUP_ID, {
      ...ctx.store.rows.get(GROUP_ID),
      callStartedAt: new Date(START + MINUTE),
    });
    ctx.store.findActiveCalls.mockResolvedValueOnce([
      { id: GROUP_ID, name: "SE345", callStartedAt: new Date(START), callStartedBy: STARTER },
    ]);
    ctx.clock.now += 60 * 1000;
    await ctx.sessions.sweep();

    expect(ctx.store.clearCallStart).toHaveBeenCalledTimes(1);
    expect(ctx.postChatMessage).not.toHaveBeenCalled();
  });
});
