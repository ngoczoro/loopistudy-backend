import ApiError from "../../utils/ApiError.js";
import { emitToRoom, groupRoom } from "../../shared/realtime/socket.js";
import { getMembershipOrThrow } from "../groups/groups.access.js";
import { postCallMessage } from "../groups/messages.service.js";
import { findUserById } from "../users/user.repository.js";
import { readCallsConfig } from "./calls.config.js";
import { collectParticipants as collectFromServers, getLivekitClient } from "./calls.livekit.js";
import { getGoogleMeetClient, normalizeMeetUrl } from "./calls.meet.js";
import * as callsRepository from "./calls.repository.js";
import { callSessions } from "./calls.sessions.js";
import {
  CALL_ERROR,
  CALL_STATUS_EVENT,
  CALL_WEBHOOK_EVENTS,
  MEET_ACTIVE_TTL_MS,
  MEET_CREATE_COOLDOWN_MS,
  groupIdFromRoomName,
  roomNameForGroup,
} from "./calls.constants.js";
import { activeParticipants, buildCallStatus } from "./calls.serializer.js";

/** An ApiError with a machine-readable `code` and optional `details` for the client. */
const callError = (statusCode, message, code, details) => {
  const error = new ApiError(statusCode, message);
  error.code = code;
  if (details) error.details = details;
  return error;
};

/**
 * Group video calls with automatic fallbacks:
 *
 *   1. main LiveKit server   2. fallback LiveKit server (e.g. LiveKit Cloud)
 *   3. Google Meet: created through the Meet API, else the group's standing link,
 *      else a link a member pastes.
 *
 * A group already in a call stays on the server it is on, so it is never split.
 * Dependencies are injectable for tests.
 */
export const createCallsService = ({
  getConfig = readCallsConfig,
  getClient = getLivekitClient,
  getMembership = getMembershipOrThrow,
  findUser = findUserById,
  emit = emitToRoom,
  meetStore = callsRepository,
  getMeetClient = getGoogleMeetClient,
  postChatMessage = postCallMessage,
  sessions = callSessions,
  now = () => Date.now(),
  logger = console,
} = {}) => {
  const lastMeetCreatedAt = new Map();

  // ---------- Google Meet state ----------

  const readMeetRow = async (groupId) => {
    try {
      return await meetStore.findGroupMeet(groupId);
    } catch (error) {
      logger.error?.("[calls] Could not read the group's Meet:", error?.message ?? error);
      return null;
    }
  };

  const activeMeetView = async (row) => {
    if (!row?.activeMeetUrl || !row.activeMeetAt) return null;
    const startedAt = new Date(row.activeMeetAt);
    if (now() - startedAt.getTime() > MEET_ACTIVE_TTL_MS) return null;
    const user = row.activeMeetBy ? await findUser(row.activeMeetBy).catch(() => null) : null;
    return {
      url: row.activeMeetUrl,
      startedBy: user ? { userId: String(user.id), fullName: user.fullName || "Member" } : null,
      startedAt: startedAt.toISOString(),
    };
  };

  /** What the client can fall back to when Loopi calls are unavailable. */
  const meetFallback = async (groupId) => {
    const row = await readMeetRow(groupId);
    const active = await activeMeetView(row);
    return { meetUrl: active?.url ?? null, backupMeetUrl: row?.backupMeetUrl ?? null };
  };

  // ---------- LiveKit servers ----------

  /** Who is in the group's room on every server that answers. */
  const collectParticipants = async (servers, roomName, options) =>
    (await collectFromServers(getClient, servers, roomName, options)).participants;

  const probeServer = async (server, roomName) => {
    try {
      const rooms = await getClient(server).listRooms();
      const others = rooms.filter(
        (room) => room.name !== roomName && Number(room.numParticipants) > 0,
      );
      const ours = rooms.find((room) => room.name === roomName);
      return {
        server,
        reachable: true,
        groupInCall: Number(ours?.numParticipants ?? 0) > 0,
        activeRooms: others.length,
        totalParticipants: others.reduce((sum, room) => sum + Number(room.numParticipants), 0),
      };
    } catch (error) {
      logger.error?.(`[calls] LiveKit server "${server.id}" is unavailable:`, error?.message ?? error);
      return { server, reachable: false };
    }
  };

  const hasCapacity = (config, probe) =>
    (config.maxRooms === null || probe.activeRooms < config.maxRooms) &&
    (config.maxTotalParticipants === null || probe.totalParticipants < config.maxTotalParticipants);

  /**
   * Servers to try, best first: the one the group is already on, otherwise every
   * reachable server with room for a new call, in configured order.
   */
  const pickServers = (config, probes) => {
    const reachable = probes.filter((probe) => probe.reachable);
    const current = reachable.find((probe) => probe.groupInCall);
    if (current) return { candidates: [current.server], reachable };
    return {
      candidates: reachable.filter((probe) => hasCapacity(config, probe)).map((probe) => probe.server),
      reachable,
    };
  };

  // ---------- Public API ----------

  const issueToken = async (userId, groupId) => {
    await getMembership(groupId, userId);
    const config = getConfig();
    if (!config.configured) {
      throw callError(503, "Video call chưa được cấu hình.", CALL_ERROR.NOT_CONFIGURED, {
        fallback: await meetFallback(groupId),
      });
    }

    const roomName = roomNameForGroup(groupId);
    const identity = String(userId);
    const probes = await Promise.all(config.servers.map((server) => probeServer(server, roomName)));
    const { candidates, reachable } = pickServers(config, probes);

    for (const server of candidates) {
      const client = getClient(server);
      let participants;
      try {
        await client.ensureRoom(roomName, {
          maxParticipants: config.maxParticipants,
          emptyTimeout: config.emptyTimeoutSeconds,
        });
        participants = await client.listParticipants(roomName);
      } catch (error) {
        logger.error?.(`[calls] Could not open the room on "${server.id}":`, error?.message ?? error);
        continue;
      }

      // A rejoin from another tab replaces the old session, so it does not count.
      const others = activeParticipants(participants).filter((p) => p.identity !== identity);
      if (others.length >= config.maxParticipants) {
        throw callError(
          409,
          `Phòng gọi đã đủ ${config.maxParticipants} người.`,
          CALL_ERROR.ROOM_FULL,
        );
      }

      const user = await findUser(userId);
      const token = await client.createToken({
        identity,
        name: user?.fullName || "Member",
        metadata: JSON.stringify({ avatarUrl: user?.avatarUrl ?? null }),
        roomName,
        ttl: config.tokenTtl,
      });

      // First one in: once they have connected, the group is told the call started.
      if (others.length === 0) sessions.scheduleStartCheck(groupId);

      return {
        token,
        url: server.url,
        roomName,
        maxParticipants: config.maxParticipants,
        server: server.id,
      };
    }

    const fallback = await meetFallback(groupId);
    if (reachable.length > 0 && candidates.length === 0) {
      throw callError(
        503,
        "Máy chủ gọi video đang quá tải.",
        CALL_ERROR.CAPACITY_REACHED,
        { fallback },
      );
    }
    throw callError(
      502,
      "Không kết nối được máy chủ gọi video.",
      CALL_ERROR.SERVER_UNAVAILABLE,
      { fallback },
    );
  };

  const getCallStatus = async (userId, groupId) => {
    await getMembership(groupId, userId);
    const config = getConfig();
    const participants = config.configured
      ? await collectParticipants(config.servers, roomNameForGroup(groupId))
      : [];
    const meet = await activeMeetView(await readMeetRow(groupId));
    return buildCallStatus(groupId, participants, meet);
  };

  const broadcastStatus = async (groupId, options = {}) => {
    const config = getConfig();
    const participants = config.configured
      ? await collectParticipants(config.servers, roomNameForGroup(groupId), options)
      : [];
    const meet = await activeMeetView(await readMeetRow(groupId));
    const status = buildCallStatus(groupId, participants, meet);
    emit(groupRoom(groupId), CALL_STATUS_EVENT, status);
    return status;
  };

  /** Verifies the webhook against each configured server and rebroadcasts the call state. */
  const receiveWebhook = async (rawBody, authHeader) => {
    const config = getConfig();
    if (!config.configured) {
      throw callError(503, "Video call chưa được cấu hình.", CALL_ERROR.NOT_CONFIGURED);
    }

    let event = null;
    let source = null;
    for (const server of config.servers) {
      try {
        event = await getClient(server).receiveWebhook(rawBody, authHeader);
        source = server;
        break;
      } catch {
        // Signed by another server's key, or not signed at all.
      }
    }
    if (!event) throw ApiError.unauthorized("Webhook không hợp lệ.");

    if (!CALL_WEBHOOK_EVENTS.has(event.event)) return { handled: false };
    const groupId = groupIdFromRoomName(event.room?.name);
    if (!groupId) return { handled: false };

    await broadcastStatus(groupId, {
      // A finished room is empty on the server that sent the event.
      skip: event.event === "room_finished" ? source.id : null,
      // The list can still include someone who just left.
      exclude: event.event === "participant_left" ? (event.participant?.identity ?? null) : null,
    });
    if (event.event === "participant_joined") {
      await sessions.confirmStart(groupId, { identity: event.participant?.identity ?? null });
    }
    return { handled: true, groupId };
  };

  /** Stores the group's Meet (first one wins) and tells everyone. */
  const publishMeet = async (userId, groupId, url) => {
    const claimed = await meetStore.claimActiveMeet(groupId, {
      url,
      userId,
      expiredBefore: new Date(now() - MEET_ACTIVE_TTL_MS),
    });
    if (claimed) {
      try {
        await postChatMessage(userId, groupId, {
          kind: "meet",
          content: `Google Meet: ${url}`,
          metadata: { url },
        });
      } catch (error) {
        logger.error?.("[calls] Could not post the Meet link to chat:", error?.message ?? error);
      }
    }
    const status = await broadcastStatus(groupId);
    return { meet: status.meet, created: claimed };
  };

  /** Creates a Meet through the Google API, or returns the group's current one. */
  const startMeet = async (userId, groupId) => {
    await getMembership(groupId, userId);
    const row = await readMeetRow(groupId);
    const existing = await activeMeetView(row);
    if (existing) return { meet: existing, created: false };

    const fallback = { backupMeetUrl: row?.backupMeetUrl ?? null };
    const { meet: meetConfig } = getConfig();
    if (!meetConfig.configured) {
      throw callError(
        503,
        "Chưa cấu hình tự tạo Google Meet.",
        CALL_ERROR.MEET_AUTO_UNAVAILABLE,
        { fallback },
      );
    }

    const last = lastMeetCreatedAt.get(groupId);
    if (last && now() - last < MEET_CREATE_COOLDOWN_MS) {
      throw callError(
        429,
        "Nhóm vừa tạo Google Meet, thử lại sau ít phút.",
        CALL_ERROR.MEET_RATE_LIMITED,
        { fallback },
      );
    }
    lastMeetCreatedAt.set(groupId, now());

    let url;
    try {
      url = await getMeetClient(meetConfig).createSpace();
    } catch (error) {
      logger.error?.(
        "[calls] Google Meet API failed:",
        error?.response?.data?.error?.message ?? error?.message ?? error,
      );
      throw callError(
        503,
        "Không tự tạo được Google Meet.",
        CALL_ERROR.MEET_AUTO_UNAVAILABLE,
        { fallback },
      );
    }
    return publishMeet(userId, groupId, url);
  };

  /** A Meet link a member created by hand and pasted. */
  const shareMeet = async (userId, groupId, rawUrl) => {
    await getMembership(groupId, userId);
    const url = normalizeMeetUrl(rawUrl);
    if (!url) {
      throw callError(
        400,
        "Link phải là Google Meet, ví dụ https://meet.google.com/abc-defg-hij.",
        CALL_ERROR.MEET_INVALID_URL,
      );
    }
    return publishMeet(userId, groupId, url);
  };

  const endMeet = async (userId, groupId) => {
    await getMembership(groupId, userId);
    await meetStore.clearActiveMeet(groupId);
    return broadcastStatus(groupId);
  };

  /**
   * The user pressed Leave. If they were the last one in, the call ends now instead of
   * after the grace time kept for dropped connections.
   */
  const leaveCall = async (userId, groupId) => {
    await getMembership(groupId, userId);
    const ended = await sessions.endIfEmpty(groupId, { leavingIdentity: String(userId) });
    return { ended };
  };

  return { issueToken, getCallStatus, receiveWebhook, startMeet, shareMeet, endMeet, leaveCall };
};

export const callsService = createCallsService();
