import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as resourceRecommendationService from "../services/resource-recommendation.service.js";

export const getResourceRecommendations = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;

  const data = await resourceRecommendationService.getRecommendations(
    req.user.userId,
    {
      q: query.q,
      limit: query.limit,
      subjectId: query.subjectId ?? null,
    },
  );

  res.json(
    buildSuccessResponse("Learning resources retrieved successfully", data),
  );
});

export const regenerateResourceRecommendations = asyncHandler(async (req, res) => {
  const data = await resourceRecommendationService.regenerateRecommendations(
    req.user.userId,
    req.body,
  );

  res.status(201).json(
    buildSuccessResponse("Learning resources regenerated successfully", data),
  );
});

export const getResourceRecommendationHistory = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;

  const data = await resourceRecommendationService.listRecommendationHistory(
    req.user.userId,
    {
      limit: query.limit,
      subjectId: query.subjectId,
    },
  );

  res.json(
    buildSuccessResponse("Recommendation history fetched successfully", data),
  );
});

export const getResourceRecommendationHistoryById = asyncHandler(async (req, res) => {
  const data = await resourceRecommendationService.getRecommendationHistoryById(
    req.user.userId,
    req.params.id,
  );

  res.json(
    buildSuccessResponse("Recommendation history fetched successfully", data),
  );
});
