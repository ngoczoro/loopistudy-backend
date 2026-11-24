import {
  DEFAULT_EMPTY_TIMEOUT_SECONDS,
  DEFAULT_MAX_PARTICIPANTS,
  DEFAULT_TOKEN_TTL,
} from "./calls.constants.js";

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** The room API speaks HTTP; clients connect over WebSocket to the same host. */
const toHttpUrl = (url) => url.replace(/^ws(s?):\/\//i, "http$1://");

/**
 * Video call settings, read when needed so tests and scripts can pass their own env.
 * `configured` is false until all three LIVEKIT_* values are set.
 */
export const readCallsConfig = (env = process.env) => {
  const url = env.LIVEKIT_URL?.trim() ?? "";
  const apiKey = env.LIVEKIT_API_KEY?.trim() ?? "";
  const apiSecret = env.LIVEKIT_API_SECRET?.trim() ?? "";

  return {
    configured: Boolean(url && apiKey && apiSecret),
    url,
    apiUrl: url ? toHttpUrl(url) : "",
    apiKey,
    apiSecret,
    maxParticipants: positiveInt(env.CALL_MAX_PARTICIPANTS, DEFAULT_MAX_PARTICIPANTS),
    tokenTtl: env.CALL_TOKEN_TTL?.trim() || DEFAULT_TOKEN_TTL,
    emptyTimeoutSeconds: DEFAULT_EMPTY_TIMEOUT_SECONDS,
  };
};
