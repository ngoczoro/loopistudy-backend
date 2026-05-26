import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getPaginationParams } from "../../../utils/response.js";
import * as adminSubjectsService from "./adminSubjects.service.js";

export const listSubjects = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const { page, limit, offset } = getPaginationParams(query);
  const { subjects, total } = await adminSubjectsService.listSubjects(query, {
    limit,
    offset,
  });

  res.json({
    success: true,
    data: {
      subjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

export const deleteSubject = asyncHandler(async (req, res) => {
  await adminSubjectsService.deleteSubjectById(req.params.id);

  res.json({
    success: true,
    message: "Subject deleted successfully",
  });
});
