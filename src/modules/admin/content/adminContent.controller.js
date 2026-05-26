import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getPaginationParams } from "../../../utils/response.js";
import * as adminContentService from "./adminContent.service.js";

export const listContent = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const { page, limit, offset } = getPaginationParams(query);
  const { content, total } = await adminContentService.listContent(query, {
    limit,
    offset,
  });

  res.json({
    success: true,
    data: {
      content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

export const deleteContent = asyncHandler(async (req, res) => {
  await adminContentService.deleteContentById(req.params.id);

  res.json({
    success: true,
    message: "Content deleted successfully",
  });
});

export const getContentById = asyncHandler(async (req, res) => {
  const data = await adminContentService.getContentDetail(req.params.id);
  res.json({
    success: true,
    data,
  });
});

export const getTextPreview = asyncHandler(async (req, res) => {
  const data = await adminContentService.getTextPreview(req.params.id);
  res.json({
    success: true,
    data,
  });
});

export const getDocPreview = asyncHandler(async (req, res) => {
  const data = await adminContentService.getDocPreview(req.params.id);
  res.json({
    success: true,
    data,
  });
});

export const getExcelPreview = asyncHandler(async (req, res) => {
  const data = await adminContentService.getExcelPreview(req.params.id);
  res.json({
    success: true,
    data,
  });
});
