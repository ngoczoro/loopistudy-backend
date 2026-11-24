import { AccessToken, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";
import { LIVEKIT_REQUEST_TIMEOUT_MS } from "./calls.constants.js";

const isNotFound = (error) =>
  error?.status === 404 || error?.code === "not_found" || /not.?found/i.test(error?.message ?? "");

/** Rejects when `promise` takes longer than `ms`, so a dead server fails fast. */
export const withTimeout = (promise, ms = LIVEKIT_REQUEST_TIMEOUT_MS) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`LiveKit did not answer within ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Thin wrapper over the LiveKit SDK for one server, so the service can be tested
 * with a fake client.
 */
export const createLivekitClient = (server) => {
  const rooms = new RoomServiceClient(server.apiUrl, server.apiKey, server.apiSecret);
  const receiver = new WebhookReceiver(server.apiKey, server.apiSecret);

  return {
    /** Creates the room, or returns it unchanged when it already exists. */
    ensureRoom: (name, { maxParticipants, emptyTimeout }) =>
      withTimeout(rooms.createRoom({ name, maxParticipants, emptyTimeout })),

    /** Every open room with its participant count, for capacity checks. */
    listRooms: () => withTimeout(rooms.listRooms()),

    /** Participants in a room; an empty list when the room does not exist. */
    listParticipants: async (name) => {
      try {
        return await withTimeout(rooms.listParticipants(name));
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
    },

    createToken: ({ identity, name, metadata, roomName, ttl }) => {
      const token = new AccessToken(server.apiKey, server.apiSecret, {
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

const cache = new Map();

export const getLivekitClient = (server) => {
  const key = `${server.apiUrl}|${server.apiKey}|${server.apiSecret}`;
  if (!cache.has(key)) cache.set(key, createLivekitClient(server));
  return cache.get(key);
};
