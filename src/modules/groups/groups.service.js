import crypto from "crypto";
import fs from "fs";
import ApiError from "../../utils/ApiError.js";
import {
  deleteImageFromCloudinary,
  uploadImageToCloudinary,
} from "../../services/cloudinaryUpload.service.js";
import {
  closeRoom,
  groupRoom,
  removeUserFromRoom,
} from "../../shared/realtime/socket.js";
import * as groupsRepository from "./groups.repository.js";
import * as messagesService from "./messages.service.js";
import * as tasksService from "./tasks.service.js";
import {
  getMembershipOrThrow,
  getOwnerMembershipOrThrow,
} from "./groups.access.js";
import { serializeGroup, serializeMember } from "./groups.serializer.js";
import {
  GROUP_AVATAR_FOLDER,
  GROUP_ROLE,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_MAX_ATTEMPTS,
  INVITE_CODE_PART_LENGTH,
} from "./groups.constants.js";

const randomInviteCode = () => {
  const length = INVITE_CODE_PART_LENGTH * 2;
  const chars = Array.from(
    { length },
    () => INVITE_CODE_ALPHABET[crypto.randomInt(INVITE_CODE_ALPHABET.length)],
  ).join("");
  return `${chars.slice(0, INVITE_CODE_PART_LENGTH)}-${chars.slice(INVITE_CODE_PART_LENGTH)}`;
};

const generateUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < INVITE_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = randomInviteCode();
    if (!(await groupsRepository.inviteCodeExists(code))) return code;
  }
  throw ApiError.internalServer("Không tạo được mã mời, vui lòng thử lại.");
};

/** Accepts "caps-7kq9", "CAPS7KQ9", " CAPS-7KQ9 " → "CAPS-7KQ9". */
const normalizeInviteCode = (raw) => {
  const compact = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== INVITE_CODE_PART_LENGTH * 2) return null;
  return `${compact.slice(0, INVITE_CODE_PART_LENGTH)}-${compact.slice(INVITE_CODE_PART_LENGTH)}`;
};

const normalizeDescription = (value) => {
  if (value === undefined) return undefined;
  const trimmed = value == null ? "" : String(value).trim();
  return trimmed || null;
};

const isTruthyFlag = (value) => value === true || value === "true";

const cleanupTempFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

const removeCloudinaryImage = async (publicId) => {
  try {
    await deleteImageFromCloudinary(publicId);
  } catch (error) {
    console.error("Failed to delete group avatar from Cloudinary:", error.message);
  }
};

export { getMembershipOrThrow, getOwnerMembershipOrThrow };

const buildGroupViews = async (memberships) => {
  const groupIds = memberships.map((membership) => membership.groupId);
  const [memberCounts, chatSummaries, progressSummaries] = await Promise.all([
    groupsRepository.countMembersByGroupIds(groupIds),
    messagesService.getChatSummaries(memberships),
    tasksService.getProgressSummaries(groupIds),
  ]);

  return memberships.map((membership) =>
    serializeGroup(membership, {
      memberCount: memberCounts.get(membership.groupId) ?? 0,
      progress: progressSummaries.get(membership.groupId),
      ...chatSummaries.get(membership.groupId),
    }),
  );
};

const buildGroupView = async (membership) => {
  const [view] = await buildGroupViews([membership]);
  return view;
};

const reloadView = async (groupId, userId) =>
  buildGroupView(await getMembershipOrThrow(groupId, userId));

const activityTime = (view) =>
  new Date(view.lastMessage?.createdAt ?? view.updatedAt).getTime();

export const listMyGroups = async (userId) => {
  const memberships = await groupsRepository.findMembershipsByUser(userId);
  const views = await buildGroupViews(memberships);

  return views.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return activityTime(b) - activityTime(a);
  });
};

export const createGroup = async (userId, payload) => {
  const group = await groupsRepository.createGroupWithOwner(
    {
      name: payload.name.trim(),
      description: normalizeDescription(payload.description) ?? null,
      inviteCode: await generateUniqueInviteCode(),
    },
    userId,
  );
  return reloadView(group.id, userId);
};

export const getGroup = async (userId, groupId) =>
  buildGroupView(await getMembershipOrThrow(groupId, userId));

export const updateGroup = async (userId, groupId, payload, avatarFile) => {
  try {
    const membership = await getOwnerMembershipOrThrow(groupId, userId);
    const group = membership.group;
    const changes = {};
    const previousPublicId = group.avatarPublicId;

    if (payload.name !== undefined) changes.name = String(payload.name).trim();
    const description = normalizeDescription(payload.description);
    if (description !== undefined) changes.description = description;

    if (avatarFile) {
      const uploaded = await uploadImageToCloudinary(avatarFile, {
        folder: GROUP_AVATAR_FOLDER,
      });
      changes.avatarUrl = uploaded.secureUrl;
      changes.avatarPublicId = uploaded.publicId;
    } else if (isTruthyFlag(payload.removeAvatar)) {
      changes.avatarUrl = null;
      changes.avatarPublicId = null;
    }

    if (Object.keys(changes).length > 0) {
      await groupsRepository.updateGroup(group, changes);
    }

    const avatarReplaced =
      "avatarPublicId" in changes && previousPublicId && previousPublicId !== changes.avatarPublicId;
    if (avatarReplaced) await removeCloudinaryImage(previousPublicId);

    return reloadView(groupId, userId);
  } finally {
    cleanupTempFile(avatarFile);
  }
};

export const deleteGroup = async (userId, groupId) => {
  const membership = await getOwnerMembershipOrThrow(groupId, userId);
  await groupsRepository.softDeleteGroup(membership.group);
  closeRoom(groupRoom(groupId));
};

export const joinGroup = async (userId, rawInviteCode) => {
  const inviteCode = normalizeInviteCode(rawInviteCode);
  const group = inviteCode
    ? await groupsRepository.findGroupByInviteCode(inviteCode)
    : null;
  if (!group) throw ApiError.notFound("Mã mời không đúng hoặc nhóm không còn tồn tại.");

  const existing = await groupsRepository.findMembership(group.id, userId);
  if (existing) throw ApiError.conflict("Bạn đã là thành viên của nhóm này.");

  await groupsRepository.addMember(group.id, userId);
  return reloadView(group.id, userId);
};

export const leaveGroup = async (userId, groupId) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  if (membership.role === GROUP_ROLE.OWNER) {
    throw ApiError.conflict("Trưởng nhóm không thể rời nhóm. Hãy xóa nhóm nếu không dùng nữa.");
  }
  await groupsRepository.removeMember(groupId, userId);
  await tasksService.unassignMember(groupId, userId);
  removeUserFromRoom(userId, groupRoom(groupId));
};

export const regenerateInviteCode = async (userId, groupId) => {
  const membership = await getOwnerMembershipOrThrow(groupId, userId);
  const inviteCode = await generateUniqueInviteCode();
  await groupsRepository.updateGroup(membership.group, { inviteCode });
  return { inviteCode };
};

export const updateMySettings = async (userId, groupId, payload) => {
  const membership = await getMembershipOrThrow(groupId, userId);
  const changes = {};
  if (payload.pinned !== undefined) changes.pinned = isTruthyFlag(payload.pinned);
  if (payload.muted !== undefined) changes.muted = isTruthyFlag(payload.muted);

  await groupsRepository.updateMembership(membership, changes);
  return reloadView(groupId, userId);
};

export const listMembers = async (userId, groupId) => {
  await getMembershipOrThrow(groupId, userId);
  const members = await groupsRepository.listMembers(groupId);
  return members.map(serializeMember);
};

export const removeMember = async (userId, groupId, targetUserId) => {
  await getOwnerMembershipOrThrow(groupId, userId);
  if (targetUserId === userId) {
    throw ApiError.badRequest("Không thể tự xóa chính mình khỏi nhóm.");
  }

  const removed = await groupsRepository.removeMember(groupId, targetUserId);
  if (!removed) throw ApiError.notFound("Người này không phải thành viên nhóm.");
  await tasksService.unassignMember(groupId, targetUserId);
  removeUserFromRoom(targetUserId, groupRoom(groupId));
};
