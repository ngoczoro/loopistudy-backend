import OpenAI from "openai";
import ApiError from "../../../utils/ApiError.js";
import { getOpenAIConfig } from "../ai.constants.js";

let cachedClient = null;

export const getOpenAIClient = () => {
  if (cachedClient) return cachedClient;

  const { apiKey } = getOpenAIConfig();
  if (!apiKey) {
    throw ApiError.internalServer(
      "OpenAI API key is not configured. Set OPENAI_API_KEY in the server environment.",
    );
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
};

/** @internal Test helper */
export const resetOpenAIClientCache = () => {
  cachedClient = null;
};
