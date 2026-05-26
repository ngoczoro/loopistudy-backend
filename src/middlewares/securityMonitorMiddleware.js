import { logSuspiciousActivity } from "../shared/security/securityAudit.service.js";

const WINDOW_MS = 60 * 1000;
const REQUEST_THRESHOLD = 200;
const UPLOAD_THRESHOLD = 30;
const TOGGLE_THRESHOLD = 40;

const requestBuckets = new Map();
const uploadBuckets = new Map();
const toggleBuckets = new Map();

const bumpBucket = (store, key) => {
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { count: 0, windowStart: now, logged: false };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return bucket;
};

const maybeLog = async (bucket, req, eventType, threshold, metadata) => {
  if (bucket.logged || bucket.count < threshold) return;

  bucket.logged = true;
  await logSuspiciousActivity(req, eventType, {
    requestCount: bucket.count,
    threshold,
    windowMs: WINDOW_MS,
    ...metadata,
  });
};

/**
 * Monitor-only middleware — logs suspicious traffic, does not block requests.
 * Skipped in development to avoid noise while iterating locally.
 */
export const securityMonitorMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    next();
    return;
  }

  const actorKey = `${req.ip}:${req.user?.userId || "anon"}`;
  const requestBucket = bumpBucket(requestBuckets, actorKey);

  maybeLog(requestBucket, req, "excessive_requests", REQUEST_THRESHOLD, {
    method: req.method,
  }).catch(() => {});

  if (req.method === "POST" && req.originalUrl.includes("/content/upload")) {
    const uploadBucket = bumpBucket(uploadBuckets, actorKey);
    maybeLog(uploadBucket, req, "excessive_uploads", UPLOAD_THRESHOLD).catch(
      () => {},
    );
  }

  if (
    req.method === "PATCH" &&
    /\/tasks\/[^/]+\/complete$/.test(req.originalUrl)
  ) {
    const toggleBucket = bumpBucket(toggleBuckets, actorKey);
    maybeLog(toggleBucket, req, "task_toggle_spam", TOGGLE_THRESHOLD).catch(
      () => {},
    );
  }

  next();
};
