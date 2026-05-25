import cloudinary, {
  assertCloudinaryConfigured,
} from "../shared/config/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import { getExtension } from "../shared/utils/contentFileTypes.js";

export const CLOUDINARY_FOLDER = "loopi-study/materials";

const mapCloudinaryError = (error) => {
  const message =
    error?.message ||
    error?.error?.message ||
    "Cloudinary upload failed";

  if (/Must supply api_key|Invalid cloud_name|Unknown API key/i.test(message)) {
    return ApiError.internalServer(
      "Cloudinary is not configured correctly. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env",
    );
  }

  return ApiError.internalServer(message);
};

const uploadToCloudinary = async (file, options) => {
  assertCloudinaryConfigured();

  if (!file?.path) {
    throw ApiError.badRequest("Uploaded file path is missing");
  }

  try {
    const result = await cloudinary.uploader.upload(file.path, options);

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw mapCloudinaryError(error);
  }
};

export const uploadImageToCloudinary = async (file) =>
  uploadToCloudinary(file, {
    folder: CLOUDINARY_FOLDER,
    resource_type: "image",
  });

export const uploadDocumentToCloudinary = async (file) => {
  const extension = getExtension(file.originalname);

  return uploadToCloudinary(file, {
    folder: CLOUDINARY_FOLDER,
    resource_type: "raw",
    ...(extension ? { format: extension } : {}),
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
