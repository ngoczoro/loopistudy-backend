import * as adminSearchRepository from "./adminSearch.repository.js";
import {
  serializeAdminSearchDocument,
  serializeAdminSearchQuiz,
  serializeAdminSearchResult,
  serializeAdminSearchSubject,
  serializeAdminSearchUser,
  serializeAdminSearchViolation,
} from "./adminSearch.serializer.js";

const SEARCH_LIMIT = 5;

export const searchAdmin = async (query) => {
  const trimmed = String(query ?? "").trim();

  const [users, subjects, documents, quizzes, violations] = await Promise.all([
    adminSearchRepository.searchUsers(trimmed, SEARCH_LIMIT),
    adminSearchRepository.searchSubjects(trimmed, SEARCH_LIMIT),
    adminSearchRepository.searchDocuments(trimmed, SEARCH_LIMIT),
    adminSearchRepository.searchQuizzes(trimmed, SEARCH_LIMIT),
    adminSearchRepository.searchViolations(trimmed, SEARCH_LIMIT),
  ]);

  const subjectIds = subjects
    .map((subject) => subject.id)
    .filter(Boolean);
  const documentCounts =
    await adminSearchRepository.countDocumentsBySubjectIds(subjectIds);

  return serializeAdminSearchResult({
    users: users.map(serializeAdminSearchUser).filter(Boolean),
    subjects: subjects
      .map((subject) =>
        serializeAdminSearchSubject(subject, documentCounts[subject.id] ?? 0),
      )
      .filter(Boolean),
    documents: documents.map(serializeAdminSearchDocument).filter(Boolean),
    quizzes: quizzes.map(serializeAdminSearchQuiz).filter(Boolean),
    violations: violations.map(serializeAdminSearchViolation).filter(Boolean),
  });
};
