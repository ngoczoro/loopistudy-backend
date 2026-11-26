import { ServiceError, notFound } from "../errors.js";

export const notFoundHandler = (req, _res, next) => next(notFound(req.path));

/** Turns any error into the API.md error shape. Details of unexpected errors stay in the log. */
export const errorHandler = (logger) => (error, req, res, _next) => {
  let serviceError = error;
  if (!(error instanceof ServiceError)) {
    if (error?.type === "entity.too.large") {
      serviceError = new ServiceError(413, "PAYLOAD_TOO_LARGE", "Request body is larger than 5 MB");
    } else if (error?.type === "entity.parse.failed") {
      serviceError = new ServiceError(400, "INVALID_REQUEST", "Request body is not valid JSON");
    } else {
      logger.error(`Unexpected error id=${req.id}:`, error);
      serviceError = new ServiceError(500, "INTERNAL", "Internal error");
    }
  }

  if (serviceError.retryAfterSec) res.set("Retry-After", String(serviceError.retryAfterSec));
  res.status(serviceError.status).json({
    error: { code: serviceError.code, message: serviceError.message },
  });
};
