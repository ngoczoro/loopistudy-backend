import { randomUUID } from "node:crypto";

const REQUEST_ID = /^[\w.-]{1,100}$/;

/**
 * Gives every request an id (the backend's `x-request-id`, or a new one), sends it back,
 * and logs one line when the response is finished: method, path, status, time, id.
 */
export const requestLog = (logger) => (req, res, next) => {
  const given = req.get("x-request-id");
  req.id = given && REQUEST_ID.test(given) ? given : randomUUID();
  res.set("x-request-id", req.id);

  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${ms.toFixed(1)}ms id=${req.id}`);
  });
  next();
};
