import { emitToRoom, userRoom } from "../../shared/realtime/socket.js";
import * as notificationService from "../../services/notificationService.js";
import { postCallMessage } from "../groups/messages.service.js";
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
 *   - start: the first person joins an empty room → a "call started" chat card, a
 *     notification for every member except the starter and those who muted the group,
 *     and a `call:started` event to every member (a toast for the same people).
 *   - end: the room stays empty for CALL_END_GRACE_MS → a "call ended" card with the
 *     duration, the notifications marked as over, and `call:ended`. When the last person
 *     leaves with the Leave button (`endIfEmpty`), it ends right away: the grace time
 *     only exists for dropped connections, which may come back.
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
  postChatMessage = postCallMessage,
  createNotification = notificationService.create,
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

  const postSafely = async (userId, groupId, message) => {
    if (!isUuid(userId)) return;
    try {
      await postChatMessage(userId, groupId, message);
    } catch (error) {
      logError("Could not post the call message to chat:", error);
    }
  };

  const loadRecipients = async (groupId) => {
    try {
      return await store.findCallRecipients(groupId);
    } catch (error) {
      logError("Could not load the group's members:", error);
      return [];
    }
  };

  /** Muted members and the person who started still see the dot, but are not notified. */
  const shouldNotify = (member, skipUserId) =>
    String(member.userId) !== skipUserId && !member.muted;

  const emitToMembers = (members, event, payload, { skipUserId = null } = {}) => {
    for (const member of members) {
      emit(userRoom(String(member.userId)), event, {
        ...payload,
        notify: event === CALL_STARTED_EVENT && shouldNotify(member, skipUserId),
      });
    }
  };

  const createStartNotifications = async (members, skipUserId, { groupId, groupName, who, startedAt }) => {
    for (const member of members) {
      if (!shouldNotify(member, skipUserId)) continue;
      try {
        await createNotification(String(member.userId), {
          type: "group_call_started",
          title: `${who} started a call`.slice(0, 200),
          body: groupName ? `in ${groupName}` : null,
          metadata: { groupId, groupName, startedAt },
        });
      } catch (error) {
        logError("Could not save the call notification:", error);
      }
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
      const startedBy = user ? { userId: String(user.id), fullName: user.fullName || "Member" } : null;
      const groupName = state.name ?? null;
      await postSafely(userId, groupId, {
        kind: "call_started",
        content: "Started a group call",
        metadata: { startedAt: startedAt.toISOString() },
      });

      // Notifications are saved before the event, so a member refreshing on it sees them.
      const members = await loadRecipients(groupId);
      await createStartNotifications(members, userId, {
        groupId,
        groupName,
        who: startedBy?.fullName ?? "Someone",
        startedAt: startedAt.toISOString(),
      });
      emitToMembers(
        members,
        CALL_STARTED_EVENT,
        { groupId, groupName, startedBy, startedAt: startedAt.toISOString() },
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
    await postSafely(starterId, row.id, {
      kind: "call_ended",
      content: `Call ended · ${formatCallDuration(durationMs)}`,
      metadata: { startedAt: new Date(row.callStartedAt).toISOString(), durationMs },
    });
    try {
      await store.endCallNotifications(row.id, new Date(endedAtMs));
    } catch (error) {
      logError("Could not mark the call notifications as ended:", error);
    }
    emitToMembers(await loadRecipients(row.id), CALL_ENDED_EVENT, {
      groupId: row.id,
      endedAt: new Date(endedAtMs).toISOString(),
      durationMs,
    });
    return true;
  };

  /**
   * Ends the call now if nobody but `leavingIdentity` is left in the room. Called when
   * someone leaves on purpose; LiveKit may still list them for a moment, so they are
   * not counted. Does nothing while any server cannot be asked, since its room may
   * still be busy (the sweep ends the call later).
   */
  const endIfEmpty = async (groupId, { leavingIdentity = null } = {}) => {
    const config = getConfig();
    if (!config.configured) return false;
    try {
      const row = await store.findCallState(groupId);
      if (!row?.callStartedAt) return false;

      const roomName = roomNameForGroup(groupId);
      const results = await Promise.allSettled(
        config.servers.map((server) => getClient(server).listParticipants(roomName)),
      );
      if (results.some((result) => result.status === "rejected")) return false;
      const others = activeParticipants(results.flatMap((result) => result.value)).filter(
        (participant) => participant.identity !== leavingIdentity,
      );
      if (others.length > 0) return false;
      return await finish(row, now());
    } catch (error) {
      logError("Could not end the call after the last person left:", error);
      return false;
    }
  };

  /**
   * Compares the rooms LiveKit has with the calls recorded in the DB: announces calls
   * nobody noticed starting, and ends calls whose room stayed empty past the grace time.
   *
   * Only servers that answer are looked at. A server that is switched off (e.g. the
   * Azure VM at night) cannot host a call, so waiting for it would leave calls on the
   * other server open forever. A short outage of the server a call is on does not end
   * it: the room is busy again on the next sweep, well within the grace time.
   */
  const sweep = async () => {
    const config = getConfig();
    if (!config.configured || sweeping) return;
    sweeping = true;
    try {
      const results = await Promise.allSettled(
        config.servers.map((server) => getClient(server).listRooms()),
      );
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

  return { confirmStart, scheduleStartCheck, endIfEmpty, sweep, start, stop };
};

export const callSessions = createCallSessions();

export const startCallSessionSweeper = () => {
  if (process.env.CALL_SESSIONS_ENABLED === "false") return;
  callSessions.start();
};
