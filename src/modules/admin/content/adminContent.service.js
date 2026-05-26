import { contentService } from "../../content/index.js";
import { serializeAdminContentDetail } from "./adminContent.serializer.js";

export const getContentDetail = async (id) => {
  const item = await contentService.getByIdForAdmin(id);
  return serializeAdminContentDetail(item);
};

export const getTextPreview = async (id) =>
  contentService.getTextPreviewForAdmin(id);

export const getDocPreview = async (id) =>
  contentService.getDocPreviewForAdmin(id);

export const getExcelPreview = async (id) =>
  contentService.getExcelPreviewForAdmin(id);
