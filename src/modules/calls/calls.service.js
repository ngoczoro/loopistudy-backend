import ApiError from "../../utils/ApiError.js";
import { emitToRoom, groupRoom } from "../../shared/realtime/socket.js";
import { getMembershipOrThrow } from "../groups/groups.access.js";
import { findUserById } from "../users/user.repository.js";
import { readCallsConfig } from "./calls.config.js";
import { getLivekitClient } from "./calls.livekit.js";
import {
  CALL_STATUS_EVENT,
  CALL_WEBHOOK_EVENTS,
  groupIdFromRoomName,
  roomNameForGroup,
} from "./calls.constants.js";
import { activeParticipants, buildCallStatus } from "./calls.serializer.js";

/**
 * Group video calls on LiveKit. Dependencies are injectable for tests.
 */
export const createCallsService = ({
  getConfig = readCallsConfig,
  getClient = getLivekitClient,
  getMembership = getMembershipOrThrow,
  findUser = findUserById,
  emit = emitToRoom,
  logger = console,
} = {}) => {
  const requireLivekit = () => {
    const config = getConfig();
    if (!config.configured) throw new ApiError(503, "Video call chưa được cấu hình.");
    return { config, client: getClient(config) };
  };

  const callLivekit = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error?.("[calls] LiveKit request failed:", error?.message ?? error);
      throw new ApiError(502, "Không kết nối được máy chủ gọi video.");
    }
  };

  const issueToken = async (userId, groupId) => {
    await getMembership(groupId, userId);
    const { config, client } = requireLivekit();
    const roomName = roomNameForGroup(groupId);
    const identity = String(userId);

    const participants = await callLivekit(async () => {
      await client.ensureRoom(roomName, {
        maxParticipants: config.maxParticipants,
        emptyTimeout: config.emptyTimeoutSeconds,
      });
      return client.listParticipants(roomName);
    });

    // A rejoin from another tab replaces the old session, so it does not count against the limit.
    const others = activeParticipants(participants).filter((p) => p.identity !== identity);
    if (others.length >= config.maxParticipants) {
      throw ApiError.conflict(`Phòng gọi đã đủ ${config.maxParticipants} người.`);
    }

    const user = await findUser(userId);
    const token = await client.createToken({
      identity,
      name: user?.fullName || "Member",
      metadata: JSON.stringify({ avatarUrl: user?.avatarUrl ?? null }),
      roomName,
      ttl: config.tokenTtl,
    });

    return {
      token,
      url: config.url,
      roomName,
      maxParticipants: config.maxParticipants,
    };
  };

  const getCallStatus = async (userId, groupId) => {
    await getMembership(groupId, userId);
    const { client } = requireLivekit();
    const participants = await callLivekit(() =>
      client.listParticipants(roomNameForGroup(groupId)),
    );
    return buildCallStatus(groupId, participants);
  };

  /** Broadcasts the new call state to the group's chat room. */
  const handleWebhookEvent = async (event, client) => {
    if (!CALL_WEBHOOK_EVENTS.has(event?.event)) return { handled: false };

    const roomName = event.room?.name;
    const groupId = groupIdFromRoomName(roomName);
    if (!groupId) return { handled: false };

    let participants = [];
    if (event.event !== "room_finished") {
      try {
        participants = await client.listParticipants(roomName);
      } catch (error) {
        logger.error?.("[calls] Could not list participants:", error?.message ?? error);
        return { handled: false, groupId };
      }
      // The list can still include someone who just left.
      if (event.event === "participant_left" && event.participant?.identity) {
        participants = participants.filter((p) => p.identity !== event.participant.identity);
      }
    }

    const status = buildCallStatus(groupId, participants);
    emit(groupRoom(groupId), CALL_STATUS_EVENT, status);
    return { handled: true, groupId };
  };

  const receiveWebhook = async (rawBody, authHeader) => {
    const { client } = requireLivekit();
    let event;
    try {
      event = await client.receiveWebhook(rawBody, authHeader);
    } catch {
      throw ApiError.unauthorized("Webhook không hợp lệ.");
    }
    return handleWebhookEvent(event, client);
  };

  return { issueToken, getCallStatus, receiveWebhook };
};

export const callsService = createCallsService();
