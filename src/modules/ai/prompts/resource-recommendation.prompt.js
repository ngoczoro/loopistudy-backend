export const RESOURCE_RECOMMENDATION_PROMPT_VERSION = "1.0.0";

export const buildResourceRecommendationPrompt = ({
  query = "",
  subjectName = "",
  candidates = [],
  limit = 5,
} = {}) => {
  const candidateList = candidates
    .map(
      (resource, index) =>
        `${index + 1}. id=${resource.id}; title=${resource.title}; type=${resource.type}; provider=${resource.provider}; topics=${(resource.topics ?? []).join(", ")}; description=${resource.description}`,
    )
    .join("\n");

  const instructions = `You are an academic learning advisor for students.

You are given a fixed list of trusted resources.
Recommend ONLY from this list.
Do not create new titles.
Do not create new URLs.
Do not invent resource IDs.
If no resource is relevant, return an empty resources array.

Your tasks:
1. Select up to ${limit} most relevant resources for the student's query.
2. Write a short Vietnamese reason for each selected resource.
3. Suggest a short Vietnamese learning path (3-5 steps).

Return ONLY valid JSON with this shape:
{
  "resources": [
    {
      "resourceId": "string from candidate id",
      "reason": "string in Vietnamese"
    }
  ],
  "learningPath": ["string step in Vietnamese"]
}`;

  const input = [
    `Student query: ${query}`,
    subjectName ? `Subject context: ${subjectName}` : null,
    `Maximum resources: ${limit}`,
    "Candidate resources:",
    candidateList || "No candidates available.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    feature: "resource-recommendation",
    version: RESOURCE_RECOMMENDATION_PROMPT_VERSION,
    instructions,
    input,
  };
};
