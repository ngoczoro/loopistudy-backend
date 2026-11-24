/** LiveKit room names are `group-{groupId}`: one call room per study group. */
export const CALL_ROOM_PREFIX = "group-";

export const DEFAULT_MAX_PARTICIPANTS = 25;
export const DEFAULT_TOKEN_TTL = "2h";
/** Seconds LiveKit keeps an empty room open before closing it. */
export const DEFAULT_EMPTY_TIMEOUT_SECONDS = 300;

/** Socket.IO event sent to `group:{groupId}` when someone joins or leaves the call. */
export const CALL_STATUS_EVENT = "call:status";

/** LiveKit webhook events that change who is in a call. */
export const CALL_WEBHOOK_EVENTS = new Set([
  "participant_joined",
  "participant_left",
  "room_finished",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const roomNameForGroup = (groupId) => `${CALL_ROOM_PREFIX}${groupId}`;

/** Group id from a room name, or null for rooms this app did not create. */
export const groupIdFromRoomName = (roomName) => {
  if (typeof roomName !== "string" || !roomName.startsWith(CALL_ROOM_PREFIX)) return null;
  const groupId = roomName.slice(CALL_ROOM_PREFIX.length);
  return UUID_PATTERN.test(groupId) ? groupId : null;
};
