import * as dashboardRepository from "./dashboard.repository.js";

/** Dashboard business logic — implemented in a future phase. */
export const getDashboardOverview = async () => {
  return dashboardRepository.fetchDashboardStats();
};
