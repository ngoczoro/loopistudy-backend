import ApiError from "../../../utils/ApiError.js";
import {
  AI_REQUEST_TIMEOUT_MS,
  AI_SAFE_ERROR_MESSAGE,
  getOpenAIConfig,
} from "../ai.constants.js";
import { truncateInput } from "../utils/inputGuard.js";
import {
  appendJsonOnlyInstruction,
  ensureJsonHintInInput,
  parseJsonFromModelText,
} from "../utils/jsonResponse.js";
import { getOpenAIClient } from "../utils/openaiClient.js";
import {
  isJsonFormatRequestError,
  isOpenAIApiError,
  mapOpenAIError,
} from "../utils/openaiErrors.js";
import { extractResponseText } from "../utils/responseText.js";

const buildRequestParams = ({
  instructions,
  input,
  model,
  temperature,
  maxOutputTokens,
  json = false,
}) => {
  const { model: defaultModel } = getOpenAIConfig();
  const safeInput = truncateInput(input);

  const params = {
    model: model || defaultModel,
    instructions: String(instructions ?? "").trim(),
    input: json ? ensureJsonHintInInput(safeInput) : safeInput,
  };

  if (temperature !== undefined) {
    params.temperature = temperature;
  }

  if (maxOutputTokens !== undefined) {
    params.max_output_tokens = maxOutputTokens;
  }

  if (json) {
    params.text = {
      format: { type: "json_object" },
    };
  }

  return params;
};

const createResponse = async (client, params) =>
  client.responses.create(params, { timeout: AI_REQUEST_TIMEOUT_MS });

const parseResponseJson = (response) => {
  const text = extractResponseText(response).trim();
  if (!text) {
    throw new Error("Empty JSON response");
  }

  return parseJsonFromModelText(text);
};

/**
 * Generate plain text via OpenAI Responses API.
 */
export const generateText = async ({
  instructions,
  input,
  model,
  temperature = 0.2,
  maxOutputTokens,
}) => {
  const client = getOpenAIClient();

  try {
    const response = await createResponse(
      client,
      buildRequestParams({
        instructions,
        input,
        model,
        temperature,
        maxOutputTokens,
      }),
    );

    return extractResponseText(response);
  } catch (error) {
    throw mapOpenAIError(error);
  }
};

const requestJsonResponse = async (client, options, { useJsonFormat }) => {
  const { instructions, input, model, temperature, maxOutputTokens } = options;

  const response = await createResponse(
    client,
    buildRequestParams({
      instructions: useJsonFormat
        ? instructions
        : appendJsonOnlyInstruction(instructions),
      input,
      model,
      temperature,
      maxOutputTokens,
      json: useJsonFormat,
    }),
  );

  return parseResponseJson(response);
};

/**
 * Generate and parse JSON via OpenAI Responses API.
 * Tries json_object mode first, then falls back to plain text JSON parsing.
 */
export const generateJson = async ({
  instructions,
  input,
  model,
  temperature = 0.2,
  maxOutputTokens,
}) => {
  const client = getOpenAIClient();

  try {
    return await requestJsonResponse(client, {
      instructions,
      input,
      model,
      temperature,
      maxOutputTokens,
    }, { useJsonFormat: true });
  } catch (error) {
    if (error?.name === "ApiError") throw error;

    if (isOpenAIApiError(error) && isJsonFormatRequestError(error)) {
      try {
        return await requestJsonResponse(client, {
          instructions,
          input,
          model,
          temperature,
          maxOutputTokens,
        }, { useJsonFormat: false });
      } catch (fallbackError) {
        if (fallbackError?.name === "ApiError") throw fallbackError;
        if (isOpenAIApiError(fallbackError)) {
          throw mapOpenAIError(fallbackError);
        }

        throw ApiError.internalServer(AI_SAFE_ERROR_MESSAGE);
      }
    }

    if (isOpenAIApiError(error)) {
      throw mapOpenAIError(error);
    }

    throw ApiError.internalServer(AI_SAFE_ERROR_MESSAGE);
  }
};
