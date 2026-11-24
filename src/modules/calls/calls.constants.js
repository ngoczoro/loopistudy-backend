/** LiveKit room names are `group-{groupId}`: one call room per study group. */
export const CALL_ROOM_PREFIX = "group-";

export const DEFAULT_MAX_PARTICIPANTS = 25;
export const DEFAULT_TOKEN_TTL = "2h";
/** Seconds LiveKit keeps an empty room open before closing it. */
export const DEFAULT_EMPTY_TIMEOUT_SECONDS = 300;

/** A LiveKit server that does not answer in time is treated as down. */
export const LIVEKIT_REQUEST_TIMEOUT_MS = 4000;

/** Socket.IO event sent to `group:{groupId}` when someone joins or leaves the call. */
export const CALL_STATUS_EVENT = "call:status";

/** `code` on call errors, so the client can tell a full room from a broken server. */
export const CALL_ERROR = Object.freeze({
  NOT_CONFIGURED: "CALL_NOT_CONFIGURED",
  SERVER_UNAVAILABLE: "CALL_SERVER_UNAVAILABLE",
  CAPACITY_REACHED: "CALL_CAPACITY_REACHED",
  ROOM_FULL: "CALL_ROOM_FULL",
  MEET_AUTO_UNAVAILABLE: "MEET_AUTO_UNAVAILABLE",
  MEET_INVALID_URL: "MEET_INVALID_URL",
  MEET_RATE_LIMITED: "MEET_RATE_LIMITED",
});

/** A group's Google Meet counts as active for this long after it was shared. */
export const MEET_ACTIVE_TTL_MS = 3 * 60 * 60 * 1000;
/** At most one Meet space created per group in this window. */
export const MEET_CREATE_COOLDOWN_MS = 60 * 1000;

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
