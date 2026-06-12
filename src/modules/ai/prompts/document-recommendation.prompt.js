export const DOCUMENT_RECOMMENDATION_PROMPT_VERSION = "0.1.0";

/** Placeholder builder for future AI Document Recommendation. */
export const buildDocumentRecommendationPrompt = ({
  subjectName = "",
  availableDocuments = [],
  learnerProfile = "",
} = {}) => ({
  feature: "document-recommendation",
  version: DOCUMENT_RECOMMENDATION_PROMPT_VERSION,
  instructions:
    "Placeholder system prompt for document recommendations. Implement in a future phase.",
  input: learnerProfile,
  context: {
    subjectName,
    availableDocuments,
  },
});
