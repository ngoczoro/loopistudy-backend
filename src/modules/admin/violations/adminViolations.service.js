import ApiError from "../../../utils/ApiError.js";
import * as adminViolationsRepository from "./adminViolations.repository.js";
import {
  serializeFlaggedUsersList,
  serializeViolationRow,
  serializeViolationStats,
} from "./adminViolations.serializer.js";

const applyListFilters = (flaggedUsers, query = {}) => {
  let result = flaggedUsers;

  if (query.riskLevel) {
    result = result.filter((user) => user.riskLevel === query.riskLevel);
  }

  if (query.resolved === "pending") {
    result = result.filter((user) => user.unresolvedCount > 0);
  }

  return result;
};

export const getStats = async (query = {}) => {
  const violations = await adminViolationsRepository.findViolationsForAdmin({
    ...query,
    resolved: "pending",
  });

  return serializeViolationStats(violations);
};

export const listGroupedByUser = async (query = {}, { limit, offset }) => {
  const violations = await adminViolationsRepository.findViolationsForAdmin(query);
  const flaggedUsers = applyListFilters(
    serializeFlaggedUsersList(violations),
    query,
  );
  const total = flaggedUsers.length;
  const paginated = flaggedUsers.slice(offset, offset + limit);

  return {
    flaggedUsers: paginated,
    total,
  };
};

export const resolveViolation = async (violationId, adminUserId) => {
  const row = await adminViolationsRepository.findById(violationId);

  if (!row) {
    throw ApiError.notFound("Violation not found");
  }

  if (row.resolved) {
    throw ApiError.badRequest("Violation is already resolved");
  }

  const updated = await adminViolationsRepository.markResolved(row, adminUserId);
  return serializeViolationRow(updated);
};
