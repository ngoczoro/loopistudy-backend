import { contentService } from "../../content/index.js";
import * as adminContentRepository from "./adminContent.repository.js";
import {
  serializeAdminContentDetail,
  serializeAdminContentList,
} from "./adminContent.serializer.js";

export const listContent = async (query, { limit, offset }) => {
  const where = adminContentRepository.buildAdminContentWhere(query);
  const { rows, total } = await adminContentRepository.findAllForAdmin({
    where,
    limit,
    offset,
  });

  return {
    content: serializeAdminContentList(rows),
    total,
  };
};

export const deleteContentById = async (id) => {
  await contentService.removeForAdmin(id);
};

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
