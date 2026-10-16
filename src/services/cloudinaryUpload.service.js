import fs from "fs";
import cloudinary, {
  assertCloudinaryConfigured,
} from "../shared/config/cloudinary.js";
import ApiError from "../utils/ApiError.js";

export const CLOUDINARY_FOLDER = "loopi-study/materials";

const mapCloudinaryError = (error) => {
  const message = error?.message || error?.error?.message || "Cloudinary upload failed";
  if (/Must supply api_key|Invalid cloud_name|Unknown API key/i.test(message)) {
    return ApiError.internalServer(
      "Cloudinary is not configured correctly. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env",
    );
  }
  return ApiError.internalServer(message);
};

// Hàm bổ trợ cốt lõi: Nhận fileSource (có thể là path hoặc chuỗi base64) để đẩy lên Cloudinary
const uploadToCloudinary = async (fileSource, options) => {
  assertCloudinaryConfigured();

  if (!fileSource) {
    throw ApiError.badRequest("Uploaded file source is missing");
  }

  try {
    const result = await cloudinary.uploader.upload(fileSource, options);
    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw mapCloudinaryError(error);
  }
};

// 1. Upload hình ảnh (giữ nguyên logic dùng file.path gốc của bạn)
export const uploadImageToCloudinary = async (file, { folder = CLOUDINARY_FOLDER } = {}) => {
  if (!file?.path) throw ApiError.badRequest("Uploaded file path is missing");
  
  return uploadToCloudinary(file.path, {
    folder,
    resource_type: "image",
  });
};

// 2. Upload tài liệu PDF/Word/Excel (Bảo mật bằng Base64 để tránh lỗi mất cấu trúc file thô)
export const uploadDocumentToCloudinary = async (file) => {
  let fileBuffer;
  
  if (file?.buffer) {
    fileBuffer = file.buffer;
  } else if (file?.path) {
    fileBuffer = fs.readFileSync(file.path);
  } else {
    throw ApiError.badRequest("File data is missing or corrupted");
  }

  const mimeType = file.mimetype || "application/pdf";
  const base64File = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

  return uploadToCloudinary(base64File, {
    folder: CLOUDINARY_FOLDER,
    resource_type: "raw", 
  });
};

export const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};

export const deleteDocumentFromCloudinary = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
};