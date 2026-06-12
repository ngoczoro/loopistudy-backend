export const RECOMMENDATION_PROMPT_VERSION = "0.1.0";

/** Placeholder builder for future AI Learning Recommendation. */
export const buildRecommendationPrompt = ({
  subjectName = "",
  progressSummary = "",
  recentActivity = "",
} = {}) => ({
  feature: "recommendation",
  version: RECOMMENDATION_PROMPT_VERSION,
  instructions:
    "Placeholder system prompt for learning recommendations. Implement in a future phase.",
  input: recentActivity,
  context: {
    subjectName,
    progressSummary,
  },
});
