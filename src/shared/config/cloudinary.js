import "../../config/loadEnv.js";
import { v2 as cloudinary } from "cloudinary";
import ApiError from "../../utils/ApiError.js";

const getCloudinaryConfig = () => ({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

let configured = false;

const ensureCloudinaryConfigured = () => {
  const config = getCloudinaryConfig();

  if (!configured) {
    cloudinary.config({
      ...config,
      secure: true,
    });
    configured = true;
  }

  return config;
};

export const assertCloudinaryConfigured = () => {
  const { cloud_name, api_key, api_secret } = ensureCloudinaryConfigured();

  if (!cloud_name || !api_key || !api_secret) {
    throw ApiError.internalServer(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env",
    );
  }

  return { cloud_name, api_key, api_secret };
};

export default cloudinary;
