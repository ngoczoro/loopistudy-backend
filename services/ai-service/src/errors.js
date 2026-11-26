/** An error the service answers with: `{ error: { code, message } }` and its HTTP status (API.md). */
export class ServiceError extends Error {
  constructor(status, code, message, { retryAfterSec } = {}) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

export const invalidRequest = (message) => new ServiceError(400, "INVALID_REQUEST", message);
export const unauthorized = () =>
  new ServiceError(401, "UNAUTHORIZED", "Missing or invalid x-internal-key");
export const notFound = (path) => new ServiceError(404, "NOT_FOUND", `No route for ${path}`);
