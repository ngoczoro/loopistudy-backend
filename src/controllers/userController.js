import sequelize from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { buildSuccessResponse } from "../utils/response.js";
import { serializeUser } from "../utils/authSerializer.js";

export const getMe = asyncHandler(async (req, res) => {
  const { User } = sequelize.models;
  const user = await User.findByPk(req.user.userId);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res.json(buildSuccessResponse("User profile fetched successfully", serializeUser(user)));
});
