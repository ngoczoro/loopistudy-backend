import { serializeContentItem } from "../../content/content.serializer.js";

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
