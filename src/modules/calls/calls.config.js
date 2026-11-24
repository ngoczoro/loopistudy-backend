import {
  DEFAULT_EMPTY_TIMEOUT_SECONDS,
  DEFAULT_MAX_PARTICIPANTS,
  DEFAULT_TOKEN_TTL,
} from "./calls.constants.js";

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Unset means no limit; 0 is a valid limit (no new calls on this server). */
const optionalLimit = (value) => {
  if (value === undefined || String(value).trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

/** The room API speaks HTTP; clients connect over WebSocket to the same host. */
const toHttpUrl = (url) => url.replace(/^ws(s?):\/\//i, "http$1://");

const readServer = (id, env, prefix) => {
  const url = env[`${prefix}_URL`]?.trim() ?? "";
  const apiKey = env[`${prefix}_API_KEY`]?.trim() ?? "";
  const apiSecret = env[`${prefix}_API_SECRET`]?.trim() ?? "";
  if (!url || !apiKey || !apiSecret) return null;
  return { id, url, apiUrl: toHttpUrl(url), apiKey, apiSecret };
};

/**
 * Video call settings, read when needed so tests and scripts can pass their own env.
 *
 * `servers` is tried in order: the main LiveKit server (LIVEKIT_*), then an optional
 * fallback such as LiveKit Cloud (LIVEKIT_FALLBACK_*).
 */
export const readCallsConfig = (env = process.env) => {
  const servers = [
    readServer("primary", env, "LIVEKIT"),
    readServer("fallback", env, "LIVEKIT_FALLBACK"),
  ].filter(Boolean);

  const meet = {
    clientId: env.GOOGLE_MEET_CLIENT_ID?.trim() ?? "",
    clientSecret: env.GOOGLE_MEET_CLIENT_SECRET?.trim() ?? "",
    refreshToken: env.GOOGLE_MEET_REFRESH_TOKEN?.trim() ?? "",
  };
  meet.configured = Boolean(meet.clientId && meet.clientSecret && meet.refreshToken);

  return {
    configured: servers.length > 0,
    servers,
    maxParticipants: positiveInt(env.CALL_MAX_PARTICIPANTS, DEFAULT_MAX_PARTICIPANTS),
    maxRooms: optionalLimit(env.CALL_MAX_ROOMS),
    maxTotalParticipants: optionalLimit(env.CALL_MAX_TOTAL_PARTICIPANTS),
    tokenTtl: env.CALL_TOKEN_TTL?.trim() || DEFAULT_TOKEN_TTL,
    emptyTimeoutSeconds: DEFAULT_EMPTY_TIMEOUT_SECONDS,
    meet,
  };
};
