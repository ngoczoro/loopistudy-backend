import ApiError from "../../../utils/ApiError.js";
import { ROLES, USER_STATUS } from "../../../config/constants.js";
import {
  sendAccountLockNotification,
  sendAccountUnlockNotification,
} from "../../notifications/index.js";
import * as userManagementRepository from "./userManagement.repository.js";
import {
  getDisplayUserName,
  normalizeLockReason,
} from "./userManagement.helpers.js";
import {
  serializeAdminUserDetail,
  serializeAdminUserList,
} from "./userManagement.serializer.js";
export const listUsers = async (query, { limit, offset }) => {
  const where = userManagementRepository.buildAdminUserWhere(query);
  const { rows, total } = await userManagementRepository.findUsers({
    where,
    limit,
    offset,
  });

  return {
    users: serializeAdminUserList(rows),
    total,
  };
};

export const getUserById = async (id) => {
  const user = await userManagementRepository.findUserById(id);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return serializeAdminUserDetail(user);
};

const getManageableUserOrThrow = async (targetUserId, adminUserId) => {
  const user = await userManagementRepository.findUserById(targetUserId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (user.id === adminUserId) {
    throw ApiError.badRequest("You cannot modify your own admin account");
  }

  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      "Admin accounts cannot be modified through user management",
    );
  }

  return user;
};

export const lockUser = async (adminUserId, targetUserId, { reason } = {}) => {
  const user = await getManageableUserOrThrow(targetUserId, adminUserId);

  if (user.status === USER_STATUS.LOCKED) {
    throw ApiError.conflict("User is already locked");
  }

  const normalizedReason = normalizeLockReason(reason);

  const updated = await userManagementRepository.lockUserRecord(user, {
    lockedAt: new Date(),
    lockedReason: normalizedReason,
  });

  await sendAccountLockNotification({
    email: user.email,
    userName: getDisplayUserName(user),
    reason: normalizedReason,
  });

  return serializeAdminUserDetail(updated);
};

export const unlockUser = async (adminUserId, targetUserId) => {
  const user = await getManageableUserOrThrow(targetUserId, adminUserId);

  if (user.status !== USER_STATUS.LOCKED) {
    throw ApiError.conflict("User is not locked");
  }

  const updated = await userManagementRepository.unlockUserRecord(user);

  await sendAccountUnlockNotification({
    email: user.email,
    userName: getDisplayUserName(user),
  });

  return serializeAdminUserDetail(updated);
};