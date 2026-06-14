import { ROLES } from "../../../config/constants.js";
import { contentService } from "../../content/index.js";
import { serializeContentItem } from "../../content/content.serializer.js";

export const resolveAccessibleContent = async (userId, role, documentId) => {
  if (role === ROLES.ADMIN) {
    const item = await contentService.getByIdForAdmin(documentId);
    return serializeContentItem(item);
  }

  return contentService.getById(userId, documentId);
};
