import * as dashboardRepository from "./dashboard.repository.js";
import {
  serializeDashboardStats,
  serializeRecentContentList,
} from "./dashboard.serializer.js";

export const getDashboardStats = async () => {
  const [
    totalStudents,
    activeStudents,
    lockedStudents,
    totalSubjects,
  ] = await Promise.all([
    dashboardRepository.countTotalStudents(),
    dashboardRepository.countActiveStudents(),
    dashboardRepository.countLockedStudents(),
    dashboardRepository.countTotalSubjects(),
  ]);

  return serializeDashboardStats({
    totalStudents,
    activeStudents,
    lockedStudents,
    totalSubjects,
  });
};

export const getRecentContent = async (limit = 10) => {
  const items = await dashboardRepository.fetchRecentContent(limit);
  return serializeRecentContentList(items);
};
