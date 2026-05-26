import { serializeContentItem } from "../../content/content.serializer.js";
import { getDisplayUserName } from "../user-management/userManagement.helpers.js";

const toIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const serializeAdminContentListItem = (item) => {
  if (!item) return null;

  const plain = item.get ? item.get({ plain: true }) : item;
  const owner = plain.user ?? null;

  return {
    id: plain.id,
    title: plain.title,
    type: plain.type,
    ownerId: owner?.id ?? plain.userId ?? null,
    ownerName: owner ? getDisplayUserName(owner) : "Unknown",
    createdAt: toIso(plain.createdAt ?? plain.created_at),
  };
};

export const serializeAdminContentList = (items) =>
  (items ?? [])
    .map((item) => serializeAdminContentListItem(item))
    .filter(Boolean);

export const serializeAdminContentDetail = (item) => {
  if (!item) return null;

  const content = serializeContentItem(item);
  const plain = item.get ? item.get({ plain: true }) : item;
  const owner = plain.user ?? null;

  return {
    ...content,
    owner: owner
      ? {
          id: owner.id,
          name:
            owner.fullName?.trim() ||
            owner.email?.split("@")[0] ||
            "Unknown",
          email: owner.email ?? null,
        }
      : null,
    readOnly: true,
  };
};
