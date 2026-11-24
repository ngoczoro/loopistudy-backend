import { AccessToken, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";

const isNotFound = (error) =>
  error?.status === 404 || error?.code === "not_found" || /not.?found/i.test(error?.message ?? "");

/**
 * Thin wrapper over the LiveKit SDK so the service can be tested with a fake client.
 */
export const createLivekitClient = (config) => {
  const rooms = new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);
  const receiver = new WebhookReceiver(config.apiKey, config.apiSecret);

  return {
    /** Creates the room, or returns it unchanged when it already exists. */
    ensureRoom: (name, { maxParticipants, emptyTimeout }) =>
      rooms.createRoom({ name, maxParticipants, emptyTimeout }),

    /** Participants in a room; an empty list when the room does not exist. */
    listParticipants: async (name) => {
      try {
        return await rooms.listParticipants(name);
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
    },

    createToken: ({ identity, name, metadata, roomName, ttl }) => {
      const token = new AccessToken(config.apiKey, config.apiSecret, {
        identity,
        name,
        metadata,
        ttl,
      });
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      return token.toJwt();
    },

    /** Verifies the signature against the raw request body. Throws when it does not match. */
    receiveWebhook: (rawBody, authHeader) => receiver.receive(rawBody, authHeader),
  };
};

let cached = null;

export const getLivekitClient = (config) => {
  const key = `${config.apiUrl}|${config.apiKey}|${config.apiSecret}`;
  if (cached?.key !== key) cached = { key, client: createLivekitClient(config) };
  return cached.client;
};
