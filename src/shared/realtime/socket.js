import { Server } from "socket.io";
import { allowedOrigins } from "../../middlewares/corsMiddleware.js";
import { verifyAccessToken } from "../../utils/jwt.js";
import { normalizeRole } from "../../utils/authSerializer.js";

let io = null;
const MAX_TIMER_MS = 2 ** 31 - 1;

export const userRoom = (userId) => `user:${userId}`;
export const groupRoom = (groupId) => `group:${groupId}`;

/**
 * Handshake auth: `io(url, { auth: { token: <accessToken> } })`.
 * The socket is dropped when the access token expires; the client refreshes and reconnects.
 */
const authenticate = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("unauthorized"));

  try {
    const decoded = verifyAccessToken(token);
    if (!decoded?.userId) return next(new Error("unauthorized"));

    socket.data.user = { userId: decoded.userId, role: normalizeRole(decoded.role) };
    socket.data.tokenExpiresAt = decoded.exp ? decoded.exp * 1000 : null;
    return next();
  } catch {
    return next(new Error("unauthorized"));
  }
};

const scheduleExpiry = (socket) => {
  const expiresAt = socket.data.tokenExpiresAt;
  if (!expiresAt) return;

  const timer = setTimeout(() => {
    socket.emit("auth:expired");
    socket.disconnect(true);
  }, Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMER_MS));
  socket.on("disconnect", () => clearTimeout(timer));
};

/**
 * @param {import("http").Server} httpServer
 * @param {Array<(io: Server, socket: import("socket.io").Socket) => void>} handlers feature event handlers
 */
export const initRealtime = (httpServer, handlers = []) => {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(authenticate);

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.data.user.userId));
    scheduleExpiry(socket);
    handlers.forEach((register) => register(io, socket));
  });

  return io;
};

/** No-op until `initRealtime` runs (e.g. scripts/tests without a socket server). */
export const emitToRoom = (room, event, payload) => {
  io?.to(room).emit(event, payload);
};

export const removeUserFromRoom = (userId, room) => {
  io?.in(userRoom(userId)).socketsLeave(room);
};

export const closeRoom = (room) => {
  io?.in(room).socketsLeave(room);
};
