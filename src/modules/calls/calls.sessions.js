import { emitToRoom, userRoom } from "../../shared/realtime/socket.js";
import { sendMessage } from "../groups/messages.service.js";
import { findUserById } from "../users/user.repository.js";
import { readCallsConfig } from "./calls.config.js";
import { collectParticipants, getLivekitClient } from "./calls.livekit.js";
import * as callsRepository from "./calls.repository.js";
import {
  CALL_END_GRACE_MS,
  CALL_ENDED_EVENT,
  CALL_START_CHECK_MS,
  CALL_STARTED_EVENT,
  CALL_SWEEP_INTERVAL_MS,
  groupIdFromRoomName,
  isUuid,
  roomNameForGroup,
} from "./calls.constants.js";
import { activeParticipants } from "./calls.serializer.js";

/** "less than a minute", "23 min", "1 h 5 min". */
export const formatCallDuration = (ms) => {
  const minutes = Math.floor(Math.max(ms, 0) / 60_000);
  if (minutes < 1) return "less than a minute";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

const startedAtMs = (row) => new Date(row.callStartedAt).getTime();

/**
 * Tells a group when its Loopi call starts and ends:
 *   - start: the first person joins an empty room → one chat message and a
 *     `call:started` event to every member (a toast unless they muted the group).
 *   - end: the room stays empty for CALL_END_GRACE_MS → a chat message with the
 *     duration and `call:ended`.
 *
 * Starts are noticed from a check shortly after a token is issued, from LiveKit
 * webhooks, and from a periodic sweep, so it also works where webhooks cannot reach
 * the backend (local dev). The DB claim makes sure each call is announced once.
 */
export const createCallSessions = ({
  getConfig = readCallsConfig,
  getClient = getLivekitClient,
  store = callsRepository,
  findUser = findUserById,
  emit = emitToRoom,
  postChatMessage = (userId, groupId, content) => sendMessage(userId, groupId, { content }),
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms).unref?.(),
  logger = console,
} = {}) => {
  /** groupId → when the room was first seen empty. */
  const emptySince = new Map();
  const starting = new Set();
  let sweeping = false;
  let interval = null;

  const logError = (message, error) => logger.error?.(`[calls] ${message}`, error?.message ?? error);

  const postSafely = async (userId, groupId, content) => {
    if (!isUuid(userId)) return;
    try {
      await postChatMessage(userId, groupId, content);
    } catch (error) {
      logError("Could not post the call message to chat:", error);
    }
  };

  const notifyMembers = async (groupId, event, payload, { skipUserId = null } = {}) => {
    let members = [];
    try {
      members = await store.findCallRecipients(groupId);
    } catch (error) {
      logError("Could not load the group's members:", error);
      return;
    }
    for (const member of members) {
      const userId = String(member.userId);
      emit(userRoom(userId), event, {
        ...payload,
        // Muted members and the person who started still see the dot, but no toast.
        notify: event === CALL_STARTED_EVENT && userId !== skipUserId && !member.muted,
      });
    }
  };

  /** Starter: the given identity if they are in the room, else whoever joined first. */
  const pickStarter = (participants, identity) => {
    if (identity && participants.some((participant) => participant.identity === identity)) {
      return identity;
    }
    const sorted = [...participants].sort(
      (a, b) => Number(a.joinedAt ?? 0) - Number(b.joinedAt ?? 0),
    );
    return sorted[0]?.identity ?? null;
  };

  /**
   * Announces the call if someone is really in the room and no call is recorded yet.
   * Returns true when this check announced it.
   */
  const confirmStart = async (groupId, { identity = null } = {}) => {
    const config = getConfig();
    if (!config.configured || starting.has(groupId)) return false;
    starting.add(groupId);
    try {
      const state = await store.findCallState(groupId);
      if (!state) return false;
      if (state.callStartedAt) {
        emptySince.delete(groupId);
        return false;
      }

      const { participants } = await collectParticipants(
        getClient,
        config.servers,
        roomNameForGroup(groupId),
      );
      const present = activeParticipants(participants);
      if (present.length === 0) return false;

      const starterId = pickStarter(present, identity);
      const userId = isUuid(starterId) ? starterId : null;
      const startedAt = new Date(now());
      const claimed = await store.claimCallStart(groupId, { userId, startedAt });
      if (!claimed) return false;
      emptySince.delete(groupId);

      const user = userId ? await findUser(userId).catch(() => null) : null;
      await postSafely(userId, groupId, "📹 Started a group call. Join from the video call button.");
      await notifyMembers(
        groupId,
        CALL_STARTED_EVENT,
        {
          groupId,
          groupName: state.name ?? null,
          startedBy: user ? { userId: String(user.id), fullName: user.fullName || "Member" } : null,
          startedAt: startedAt.toISOString(),
        },
        { skipUserId: userId },
      );
      return true;
    } catch (error) {
      logError("Could not check whether the call started:", error);
      return false;
    } finally {
      starting.delete(groupId);
    }
  };

  /** Called after a token for an empty room: the person needs a few seconds to connect. */
  const scheduleStartCheck = (groupId) => {
    setTimer(() => confirmStart(groupId), CALL_START_CHECK_MS);
  };

  const finish = async (row, endedAtMs) => {
    emptySince.delete(row.id);
    const cleared = await store.clearCallStart(row.id, row.callStartedAt);
    if (!cleared) return false;

    const durationMs = endedAtMs - startedAtMs(row);
    const starterId = row.callStartedBy ? String(row.callStartedBy) : null;
    await postSafely(starterId, row.id, `📹 Call ended · ${formatCallDuration(durationMs)}`);
    await notifyMembers(row.id, CALL_ENDED_EVENT, {
      groupId: row.id,
      endedAt: new Date(endedAtMs).toISOString(),
      durationMs,
    });
    return true;
  };

  /**
   * Compares the rooms LiveKit has with the calls recorded in the DB: announces calls
   * nobody noticed starting, and ends calls whose room stayed empty past the grace time.
   * A call is never ended while a server is unreachable, since its room may still be busy.
   */
  const sweep = async () => {
    const config = getConfig();
    if (!config.configured || sweeping) return;
    sweeping = true;
    try {
      const results = await Promise.allSettled(
        config.servers.map((server) => getClient(server).listRooms()),
      );
      const allReached = results.every((result) => result.status === "fulfilled");
      const busy = new Set(
        results
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value)
          .filter((room) => Number(room.numParticipants) > 0)
          .map((room) => groupIdFromRoomName(room.name))
          .filter(Boolean),
      );

      const active = await store.findActiveCalls();
      const recorded = new Set(active.map((row) => row.id));

      for (const groupId of busy) {
        if (!recorded.has(groupId)) await confirmStart(groupId);
      }

      for (const row of active) {
        if (busy.has(row.id)) {
          emptySince.delete(row.id);
          continue;
        }
        if (!allReached) continue;
        const since = emptySince.get(row.id);
        if (since === undefined) {
          emptySince.set(row.id, now());
        } else if (now() - since >= CALL_END_GRACE_MS) {
          await finish(row, since);
        }
      }
    } catch (error) {
      logError("Call sweep failed:", error);
    } finally {
      sweeping = false;
    }
  };

  /** Runs the sweep every CALL_SWEEP_INTERVAL_MS, plus once now to catch up after a restart. */
  const start = () => {
    if (interval) return;
    interval = setInterval(sweep, CALL_SWEEP_INTERVAL_MS);
    interval.unref?.();
    sweep();
  };

  const stop = () => {
    if (interval) clearInterval(interval);
    interval = null;
  };

  return { confirmStart, scheduleStartCheck, sweep, start, stop };
};

export const callSessions = createCallSessions();

export const startCallSessionSweeper = () => {
  if (process.env.CALL_SESSIONS_ENABLED === "false") return;
  callSessions.start();
};
