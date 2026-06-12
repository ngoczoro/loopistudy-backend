export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

export const MAX_AI_INPUT_CHARS = 32000;

export const AI_REQUEST_TIMEOUT_MS = 60_000;

export const AI_SAFE_ERROR_MESSAGE =
  "AI service is temporarily unavailable. Please try again later.";

export const getOpenAIConfig = () => ({
  apiKey: process.env.OPENAI_API_KEY?.trim() || "",
  model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
});
