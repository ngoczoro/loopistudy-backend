import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import * as userService from "./user.service.js";

export const getMe = asyncHandler(async (req, res) => {
  const data = await userService.getProfile(req.user.userId);
  res.json(buildSuccessResponse("User profile fetched successfully", data));
});

export const updateMe = asyncHandler(async (req, res) => {
  const data = await userService.updateProfile(req.user.userId, req.body);
  res.json(buildSuccessResponse("Profile updated successfully", data));
});

export const getPreferences = asyncHandler(async (req, res) => {
  const data = await userService.getPreferences(req.user.userId);
  res.json(buildSuccessResponse("Preferences fetched successfully", data));
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const data = await userService.updatePreferences(req.user.userId, req.body);
  res.json(buildSuccessResponse("Preferences updated successfully", data));
});

export const getBlockedSlots = asyncHandler(async (req, res) => {
  const data = await userService.getBlockedSlots(req.user.userId);
  res.json(buildSuccessResponse("Blocked slots fetched successfully", data));
});

export const replaceBlockedSlots = asyncHandler(async (req, res) => {
  const data = await userService.replaceBlockedSlots(
    req.user.userId,
    req.body.slots,
  );
  res.json(buildSuccessResponse("Blocked slots updated successfully", data));
});

export const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.userId, req.body);
  res.json(buildSuccessResponse("Password changed successfully"));
});
