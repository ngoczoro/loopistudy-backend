export const VIOLATION_TYPE_LABELS = {
  spam: "Spam content",
  inappropriate: "Inappropriate language",
  irrelevant: "Irrelevant content",
};

/** Mirrors AdminWarnings.jsx — risk from unresolved violation count per user. */
export const computeUserRiskLevel = (unresolvedCount) => {
  if (unresolvedCount >= 3) return "high";
  if (unresolvedCount >= 2) return "medium";
  return "low";
};

export const getViolationTypeLabel = (type) =>
  VIOLATION_TYPE_LABELS[type] ?? type ?? "Unknown";
