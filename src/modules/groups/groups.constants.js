export const GROUP_ROLE = {
  OWNER: "owner",
  MEMBER: "member",
};

export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_PART_LENGTH = 4;
export const INVITE_CODE_MAX_ATTEMPTS = 10;

export const GROUP_AVATAR_FIELD = "avatar";
export const GROUP_AVATAR_FOLDER = "loopi-study/groups";

export const CHAT_FILES_FIELD = "files";
export const CHAT_MAX_FILES = 5;
export const CHAT_MAX_CONTENT_LENGTH = 2000;
export const CHAT_ATTACHMENT_FOLDER = "loopi-study/group-chat";
export const CHAT_PAGE_DEFAULT_LIMIT = 30;
export const CHAT_PAGE_MAX_LIMIT = 100;
export const SHARED_TYPES = ["media", "file", "link"];
export const SHARED_DEFAULT_LIMIT = 20;
export const SHARED_MAX_LIMIT = 100;
/** How many link-bearing messages to scan when listing shared links. */
export const SHARED_LINK_SCAN_LIMIT = 300;

export const DEFAULT_GROUP_PROGRESS = Object.freeze({
  goalPercent: null,
  overdueTaskCount: 0,
  blockedTaskCount: 0,
  isBehind: false,
});
