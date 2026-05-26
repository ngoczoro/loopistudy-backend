import ApiError from "../../../utils/ApiError.js";
import * as adminSubjectsRepository from "./adminSubjects.repository.js";
import { serializeAdminSubjectList } from "./adminSubjects.serializer.js";

export const listSubjects = async (query, { limit, offset }) => {
  const where = adminSubjectsRepository.buildAdminSubjectWhere(query);
  const { rows, total } = await adminSubjectsRepository.findSubjectsForAdmin({
    where,
    limit,
    offset,
  });

  return {
    subjects: serializeAdminSubjectList(rows),
    total,
  };
};

export const deleteSubjectById = async (id) => {
  const subject = await adminSubjectsRepository.findSubjectById(id);

  if (!subject) {
    throw ApiError.notFound("Subject not found");
  }

  await adminSubjectsRepository.softDeleteSubject(subject);
};
