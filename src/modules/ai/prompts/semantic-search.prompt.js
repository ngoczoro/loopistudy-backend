export const SEMANTIC_SEARCH_PROMPT_VERSION = "0.1.0";

/** Placeholder builder for future AI Semantic Search. */
export const buildSemanticSearchPrompt = ({
  query = "",
  corpusSummary = "",
  subjectName = "",
} = {}) => ({
  feature: "semantic-search",
  version: SEMANTIC_SEARCH_PROMPT_VERSION,
  instructions:
    "Placeholder system prompt for semantic search ranking/expansion. Implement in a future phase.",
  input: corpusSummary,
  context: {
    query,
    subjectName,
  },
});
