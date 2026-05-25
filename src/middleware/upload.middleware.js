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
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };

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
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

export default upload;
