import sequelize from "../../config/database.js";
import { defineSecurityEventModel } from "../../models/SecurityEvent.js";

let SecurityEventModel = null;

const getSecurityEventModel = () => {
  if (!SecurityEventModel) {
    SecurityEventModel = defineSecurityEventModel(sequelize);
  }
  return SecurityEventModel;
};

/**
 * Persist a security/audit event. Failures are logged but never block requests.
 */
export const logSecurityEvent = async ({
  eventType,
  userId = null,
  ipAddress = null,
  endpoint = null,
  metadata = {},
}) => {
  if (!eventType) return;

  const payload = {
    eventType,
    userId,
    ipAddress,
    endpoint,
    metadata,
  };

  console.info("[security]", JSON.stringify(payload));

  try {
    await getSecurityEventModel().create(payload);
  } catch (error) {
    console.warn("[security] failed to persist event:", error.message);
  }
};

export const logAuthFailure = async (req, metadata = {}) =>
  logSecurityEvent({
    eventType: "auth_failure",
    userId: req.user?.userId ?? null,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
    metadata,
  });

export const logExcessiveUploads = async (req, metadata = {}) =>
  logSecurityEvent({
    eventType: "excessive_uploads",
    userId: req.user?.userId ?? null,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
    metadata,
  });

export const logSuspiciousActivity = async (req, eventType, metadata = {}) =>
  logSecurityEvent({
    eventType,
    userId: req.user?.userId ?? null,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
    metadata,
  });
