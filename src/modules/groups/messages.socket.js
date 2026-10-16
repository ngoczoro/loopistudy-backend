import Joi from "joi";
import { groupRoom } from "../../shared/realtime/socket.js";
import { getMembershipOrThrow } from "./groups.access.js";

const groupPayloadSchema = Joi.object({ groupId: Joi.string().uuid().required() });

const respond = (ack, payload) => {
  if (typeof ack === "function") ack(payload);
};

/**
 * client → server: `chat:join` / `chat:leave` with `{ groupId }`, optional ack `{ ok, message? }`.
 * server → client: `chat:message` (Message) on room `group:{groupId}`.
 */
export const registerChatSocketHandlers = (_io, socket) => {
  const { userId } = socket.data.user;

  socket.on("chat:join", async (payload, ack) => {
    const { error, value } = groupPayloadSchema.validate(payload ?? {});
    if (error) return respond(ack, { ok: false, message: "groupId không hợp lệ." });

    try {
      await getMembershipOrThrow(value.groupId, userId);
      await socket.join(groupRoom(value.groupId));
      respond(ack, { ok: true });
    } catch (joinError) {
      respond(ack, { ok: false, message: joinError.message });
    }
  });

  socket.on("chat:leave", async (payload, ack) => {
    const { error, value } = groupPayloadSchema.validate(payload ?? {});
    if (error) return respond(ack, { ok: false, message: "groupId không hợp lệ." });

    await socket.leave(groupRoom(value.groupId));
    respond(ack, { ok: true });
  });
};
