import { DEFAULT_GROUP_PROGRESS } from "./groups.constants.js";

const toIso = (value) => (value ? new Date(value).toISOString() : null);

export const serializeUserSummary = (user) =>
  user
    ? {
        userId: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl ?? null,
      }
    : null;

/**
 * @param {object} membership GroupMember row with `group` (and `group.owner`) included
 * @param {{ memberCount?: number, lastMessage?: object|null, unreadCount?: number, progress?: object }} extras
 */
export const serializeGroup = (membership, extras = {}) => {
  const group = membership.group;

  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    avatarUrl: group.avatarUrl ?? null,
    inviteCode: group.inviteCode,
    owner: serializeUserSummary(group.owner),
    myRole: membership.role,
    memberCount: extras.memberCount ?? 0,
    progress: extras.progress ?? { ...DEFAULT_GROUP_PROGRESS },
    lastMessage: extras.lastMessage ?? null,
    unreadCount: extras.unreadCount ?? 0,
    isPinned: Boolean(membership.pinned),
    isMuted: Boolean(membership.muted),
    createdAt: toIso(group.createdAt),
    updatedAt: toIso(group.updatedAt),
  };
};

export const serializeMember = (membership) => ({
  userId: membership.userId,
  fullName: membership.user?.fullName ?? null,
  email: membership.user?.email ?? null,
  avatarUrl: membership.user?.avatarUrl ?? null,
  role: membership.role,
  joinedAt: toIso(membership.joinedAt),
});
