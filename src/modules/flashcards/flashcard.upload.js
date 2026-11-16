import crypto from "crypto";
import multer from "multer";
import ApiError from "../../utils/ApiError.js";
import { FLASHCARD_IMAGE_DIR } from "./flashcard.paths.js";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: FLASHCARD_IMAGE_DIR,
    filename: (_req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${MIME_EXT[file.mimetype]}`);
    },
  }),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (MIME_EXT[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest("Use a JPG, PNG, or WebP image."));
  },
});

export const uploadCardImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image must be 2 MB or smaller.",
      });
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  });
};
