import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as adminContentService from "./adminContent.service.js";

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
