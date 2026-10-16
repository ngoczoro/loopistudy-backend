import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import ApiError from "../utils/ApiError.js";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  getExtension,
} from "../shared/utils/contentFileTypes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, "../../uploads");
export const UPLOAD_FIELD_NAME = "file";

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE;
export const FILE_SIZE_LIMIT_MESSAGE =
  "File vượt quá 5MB, không được phép upload.";

export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };

export const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(Number(bytes))) return "0 B";
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export const assertFileSizeWithinLimit = (file) => {
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    console.error(
      "Rejected file size:",
      file.size,
      formatFileSize(file.size),
      file.originalname,
    );
    throw ApiError.badRequest(FILE_SIZE_LIMIT_MESSAGE);
  }

  console.log(
    "Uploaded file size:",
    file.size,
    formatFileSize(file.size),
    file.originalname,
  );
};

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const isAllowedFile = (file) => {
  const ext = getExtension(file.originalname);
  return (
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    ALLOWED_EXTENSIONS.includes(ext)
  );
};

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (isAllowedFile(file)) {
    cb(null, true);
    return;
  }

  cb(
    ApiError.badRequest(
      `Unsupported file type: ${file.mimetype || "unknown"}. Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, PNG, JPG, JPEG, WEBP, GIF`,
    ),
  );
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

export const uploadSingleFile = (req, res, next) => {
  upload.single(UPLOAD_FIELD_NAME)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      console.error("Rejected file size (multer):", error.message);
      return res.status(400).json({
        success: false,
        message: FILE_SIZE_LIMIT_MESSAGE,
      });
    }

    next(error);
  });
};

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest("Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF."));
  },
});

/** Optional single image (≤ 5 MB) under `fieldName`; non-multipart requests pass through. */
export const uploadSingleImage = (fieldName) => (req, res, next) => {
  imageUpload.single(fieldName)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: FILE_SIZE_LIMIT_MESSAGE,
      });
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  });
};

export default upload;
