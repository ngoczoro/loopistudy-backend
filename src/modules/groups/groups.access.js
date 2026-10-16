import ApiError from "../../utils/ApiError.js";
import * as groupsRepository from "./groups.repository.js";
import { GROUP_ROLE } from "./groups.constants.js";

/**
 * Membership of `userId` in an active group.
 * 404 when the group does not exist, 403 when the caller is not a member.
 */
export const getMembershipOrThrow = async (groupId, userId) => {
  const membership = await groupsRepository.findMembership(groupId, userId);
  if (membership) return membership;

  const group = await groupsRepository.findGroupById(groupId);
  if (!group) throw ApiError.notFound("Không tìm thấy nhóm.");
  throw ApiError.forbidden("Bạn không phải thành viên nhóm này.");
};

export const getOwnerMembershipOrThrow = async (groupId, userId) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  if (membership.role !== GROUP_ROLE.OWNER) {
    throw ApiError.forbidden("Chỉ trưởng nhóm mới thực hiện được thao tác này.");
  }
  return membership;
};
