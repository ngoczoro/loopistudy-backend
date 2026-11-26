import { createHash, timingSafeEqual } from "node:crypto";
import { unauthorized } from "../errors.js";

// Hash both sides so the comparison takes the same time whatever the key's length.
const digest = (value) => createHash("sha256").update(String(value)).digest();

/** Lets a request through only with the shared key in `x-internal-key`. */
export const requireInternalKey = (key) => {
  const expected = digest(key);
  return (req, _res, next) => {
    const given = req.get("x-internal-key");
    if (given && timingSafeEqual(digest(given), expected)) return next();
    return next(unauthorized());
  };
};
