export const GROUP_ROLE = {
  OWNER: "owner",
  MEMBER: "member",
};

export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_PART_LENGTH = 4;
export const INVITE_CODE_MAX_ATTEMPTS = 10;

export const GROUP_AVATAR_FIELD = "avatar";
export const GROUP_AVATAR_FOLDER = "loopi-study/groups";

export const DEFAULT_GROUP_PROGRESS = Object.freeze({
  goalPercent: null,
  overdueTaskCount: 0,
  blockedTaskCount: 0,
  isBehind: false,
});
