import { CONTENT_TYPE } from "../../../config/constants.js";
import { contentService } from "../../content/index.js";

const SEARCHABLE_TYPES = new Set([CONTENT_TYPE.NOTE, CONTENT_TYPE.FILE]);

export const listDocumentsBySubject = async (userId, subjectId) => {
  const items = await contentService.listBySubject(userId, subjectId);
  return items.filter((item) => SEARCHABLE_TYPES.has(item.type));
};
