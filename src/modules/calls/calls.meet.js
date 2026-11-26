import { OAuth2Client } from "google-auth-library";

const MEET_API = "https://meet.googleapis.com/v2";
const MEET_REQUEST_TIMEOUT_MS = 8000;

/** Accepts meet.google.com/abc-defg-hij with or without https, query or trailing path. */
const MEET_URL_PATTERN = /^(?:https?:\/\/)?meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#].*)?$/i;

/**
 * The canonical `https://meet.google.com/abc-defg-hij`, or null when the input is not a
 * Google Meet link. Only these links are stored, so a group cannot be sent elsewhere.
 */
export const normalizeMeetUrl = (input) => {
  const match = String(input ?? "").trim().match(MEET_URL_PATTERN);
  return match ? `https://meet.google.com/${match[1].toLowerCase()}` : null;
};

/**
 * Creates Meet spaces as the Google account that granted the refresh token
 * (see scripts/google-meet-auth.js). Spaces are OPEN: anyone with the link can join
 * without the owner admitting them.
 */
export const createGoogleMeetClient = (meet) => {
  const client = new OAuth2Client(meet.clientId, meet.clientSecret);
  client.setCredentials({ refresh_token: meet.refreshToken });

  return {
    createSpace: async () => {
      const { data } = await client.request({
        url: `${MEET_API}/spaces`,
        method: "POST",
        data: { config: { accessType: "OPEN" } },
        timeout: MEET_REQUEST_TIMEOUT_MS,
      });
      const url = normalizeMeetUrl(data?.meetingUri);
      if (!url) throw new Error(`Unexpected meetingUri from Google: ${data?.meetingUri}`);
      return url;
    },
  };
};

let cached = null;

export const getGoogleMeetClient = (meet) => {
  const key = `${meet.clientId}|${meet.refreshToken}`;
  if (cached?.key !== key) cached = { key, client: createGoogleMeetClient(meet) };
  return cached.client;
};
