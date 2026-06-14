import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../../utils/response.js";
import * as savedLearningResourceService from "../services/saved-learning-resource.service.js";

export const saveLearningResource = asyncHandler(async (req, res) => {
  const data = await savedLearningResourceService.saveLearningResource(
    req.user.userId,
    req.body,
  );

  res.status(201).json(
    buildSuccessResponse("Learning resource saved successfully", data),
  );
});

export const getSavedLearningResources = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;

  const data = await savedLearningResourceService.listSavedLearningResources(
    req.user.userId,
    {
      subjectId: query.subjectId ?? undefined,
    },
  );

  res.json(
    buildSuccessResponse("Saved learning resources fetched successfully", data),
  );
});

export const deleteSavedLearningResource = asyncHandler(async (req, res) => {
  await savedLearningResourceService.deleteSavedLearningResource(
    req.user.userId,
    req.params.id,
  );

  res.json(buildSuccessResponse("Saved learning resource deleted successfully"));
});
