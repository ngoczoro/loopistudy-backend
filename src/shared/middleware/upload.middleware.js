import crypto from "crypto";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import ApiError from "../../utils/ApiError.js";
import cloudinary from "../config/cloudinary.js";

export const CLOUDINARY_FOLDER = "loopi-study/materials";
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE;
export const FILE_SIZE_LIMIT_MESSAGE =
  "File vượt quá 5MB, không được phép upload.";
export const UPLOAD_FIELD_NAME = "file";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "pptx",
  "ppt",
  "txt",
  "png",
  "jpg",
  "jpeg",
];

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const RAW_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
]);

const getExtension = (fileName) => {
  if (!fileName || !fileName.includes(".")) return "";
  return fileName.split(".").pop()?.toLowerCase() || "";
};

const isAllowedFile = (file) => {
  const ext = getExtension(file.originalname);
  return (
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    ALLOWED_EXTENSIONS.includes(ext)
  );
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const extension = getExtension(file.originalname);
    const isImage = IMAGE_EXTENSIONS.has(extension);
    const isRaw = RAW_EXTENSIONS.has(extension) || !isImage;

    return {
      folder: CLOUDINARY_FOLDER,
      public_id: crypto.randomUUID(),
      resource_type: isImage ? "image" : "raw",
      ...(extension && isRaw ? { format: extension } : {}),
      ...(extension && isImage ? { format: extension } : {}),
    };
  },
});

const fileFilter = (_req, file, cb) => {
  if (isAllowedFile(file)) {
    cb(null, true);
    return;
  }

  cb(
    ApiError.badRequest(
      `Unsupported file type: ${file.mimetype || "unknown"}. Allowed: PDF, DOCX, XLSX, XLS, PPTX, TXT, PNG, JPG, JPEG`,
    ),
  );
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

export const uploadSingle = (req, res, next) => {
  upload.single(UPLOAD_FIELD_NAME)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(ApiError.badRequest(FILE_SIZE_LIMIT_MESSAGE));
        return;
      }
      next(ApiError.badRequest(error.message));
      return;
    }

    next(error);
  });
};
