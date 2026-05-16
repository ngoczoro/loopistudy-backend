/**
 * Wraps async route handlers to catch errors
 * Usage: asyncHandler(async (req, res) => { ... })
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
