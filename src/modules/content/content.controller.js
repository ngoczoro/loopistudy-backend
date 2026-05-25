import fs from "fs";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { buildSuccessResponse } from "../../utils/response.js";
import {
  uploadDocumentToCloudinary,
  uploadImageToCloudinary,
} from "../../services/cloudinaryUpload.service.js";
import {
  getUploadType,
  isDocumentFile,
  isImageFile,
} from "../../shared/utils/contentFileTypes.js";
import * as contentService from "./content.service.js";

const cleanupTempFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

const sendUploadError = (res, error) => {
  console.error("UPLOAD ERROR:", error);

  const statusCode = error?.statusCode || 500;
  const payload = {
    success: false,
    message: error?.message || "Internal server error",
  };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = error?.stack;
  }

  return res.status(statusCode).json(payload);
};

export const list = asyncHandler(async (req, res) => {
  const data = await contentService.list(req.user.userId, req.query);
  res.json(buildSuccessResponse("Content fetched successfully", data));
});

export const getById = asyncHandler(async (req, res) => {
  const data = await contentService.getById(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Content fetched successfully", data));
});

export const listBySubject = asyncHandler(async (req, res) => {
  const data = await contentService.listBySubject(
    req.user.userId,
    req.params.subjectId,
  );
  res.json(
    buildSuccessResponse("Subject content fetched successfully", data),
  );
});

export const create = asyncHandler(async (req, res) => {
  const data = await contentService.create(req.user.userId, req.body);
  res
    .status(201)
    .json(buildSuccessResponse("Content created successfully", data));
});

export const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "File is required",
    });
  }

  const uploadType = getUploadType(req.file);
  if (!uploadType) {
    cleanupTempFile(req.file);
    return res.status(400).json({
      success: false,
      message: "Unsupported file type",
    });
  }

  let uploadResult;

  try {
    if (isImageFile(req.file)) {
      const cloudinaryResult = await uploadImageToCloudinary(req.file);
      uploadResult = {
        fileUrl: cloudinaryResult.secureUrl,
        cloudinaryPublicId: cloudinaryResult.publicId,
      };
    } else if (isDocumentFile(req.file)) {
      const cloudinaryResult = await uploadDocumentToCloudinary(req.file);
      uploadResult = {
        fileUrl: cloudinaryResult.secureUrl,
        cloudinaryPublicId: cloudinaryResult.publicId,
      };
    } else {
      throw ApiError.badRequest("Unsupported file type");
    }

    if (!uploadResult?.fileUrl) {
      throw ApiError.internalServer("File upload did not return a storage URL");
    }

    const data = await contentService.createFileContent(
      req.user.userId,
      req.body,
      req.file,
      uploadResult,
    );

    return res
      .status(201)
      .json(buildSuccessResponse("File uploaded successfully", data));
  } catch (error) {
    return sendUploadError(res, error);
  } finally {
    cleanupTempFile(req.file);
  }
};

export const update = asyncHandler(async (req, res) => {
  const data = await contentService.update(
    req.user.userId,
    req.params.id,
    req.body,
  );
  res.json(buildSuccessResponse("Content updated successfully", data));
});

export const remove = asyncHandler(async (req, res) => {
  await contentService.remove(req.user.userId, req.params.id);
  res.json(buildSuccessResponse("Content deleted successfully"));
});

export const getTextPreview = asyncHandler(async (req, res) => {
  const data = await contentService.getTextPreview(
    req.user.userId,
    req.params.id,
  );
  res.json(buildSuccessResponse("Text preview fetched successfully", data));
});

export const getDocPreview = asyncHandler(async (req, res) => {
  const data = await contentService.getDocPreview(
    req.user.userId,
    req.params.id,
  );
  res.json(buildSuccessResponse("Document preview fetched successfully", data));
});

export const getExcelPreview = asyncHandler(async (req, res) => {
  const data = await contentService.getExcelPreview(
    req.user.userId,
    req.params.id,
  );
  res.json(buildSuccessResponse("Excel preview fetched successfully", data));
});
