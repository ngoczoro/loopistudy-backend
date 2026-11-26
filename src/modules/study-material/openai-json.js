import { getOpenAIConfig, AI_REQUEST_TIMEOUT_MS } from "../ai/ai.constants.js";
import { generateJson } from "../ai/services/ai.provider.service.js";
import { aiServiceClient } from "../../shared/ai/aiServiceClient.js";
import { AI_SERVICE_MARGIN_MS } from "./ollama.js";

/**
 * OpenAI JSON for quizzes and flashcards, the fallback after Ollama.
 * With AI_SERVICE_URL set, the AI service holds the OpenAI key and makes the call
 * (POST /v1/llm/json); otherwise this backend calls OpenAI as before.
 */

/** Whether trying OpenAI makes sense: the service decides when it is on, else the local key. */
export const openaiJsonAvailable = () => aiServiceClient.enabled() || Boolean(getOpenAIConfig().apiKey);

/** `{ json, model }`. Throws when OpenAI (or the service) fails. */
export const completeOpenAIJson = async ({ system, user, temperature = 0.4, maxTokens }) => {
  if (aiServiceClient.enabled()) {
    const result = await aiServiceClient.post(
      "/v1/llm/json",
      { provider: "openai", system, user, maxTokens, temperature, timeoutMs: AI_REQUEST_TIMEOUT_MS },
      { timeoutMs: AI_REQUEST_TIMEOUT_MS + AI_SERVICE_MARGIN_MS, priority: "study" },
    );
    return { model: result.model, json: result.json };
  }

  const json = await generateJson({
    instructions: system,
    input: user,
    temperature,
    maxOutputTokens: maxTokens,
  });
  return { model: getOpenAIConfig().model, json };
};
