import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getPaginationParams } from "../../../utils/response.js";
import * as userManagementService from "./userManagement.service.js";

export const listUsers = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const { page, limit, offset } = getPaginationParams(query);
  const { users, total } = await userManagementService.listUsers(query, {
    limit,
    offset,
  });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const data = await userManagementService.getUserById(req.params.id);
  res.json({
    success: true,
    data,
  });
});

export const lockUser = asyncHandler(async (req, res) => {
  await userManagementService.lockUser(req.user.userId, req.params.id, req.body);
  res.json({
    success: true,
    message: "User locked successfully",
  });
});

export const unlockUser = asyncHandler(async (req, res) => {
  await userManagementService.unlockUser(req.user.userId, req.params.id);
  res.json({
    success: true,
    message: "User unlocked successfully",
  });
});
