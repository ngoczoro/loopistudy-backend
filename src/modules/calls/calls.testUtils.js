import crypto from "crypto";
import { AccessToken } from "livekit-server-sdk";

/** Test-only keys. Not real credentials. */
export const TEST_LIVEKIT_ENV = {
  LIVEKIT_URL: "wss://loopi-test.livekit.cloud",
  LIVEKIT_API_KEY: "APItestkey",
  LIVEKIT_API_SECRET: "test-secret-that-is-long-enough-for-hs256",
};

/** Signs a webhook body the same way LiveKit does (JWT with a sha256 claim of the body). */
export const signWebhook = async (
  body,
  { apiKey = TEST_LIVEKIT_ENV.LIVEKIT_API_KEY, apiSecret = TEST_LIVEKIT_ENV.LIVEKIT_API_SECRET } = {},
) => {
  const token = new AccessToken(apiKey, apiSecret);
  token.sha256 = crypto.createHash("sha256").update(body).digest("base64");
  return token.toJwt();
};
