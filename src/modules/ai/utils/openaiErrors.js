import ApiError from "../../../utils/ApiError.js";
import { AI_SAFE_ERROR_MESSAGE } from "../ai.constants.js";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logOpenAIError = (error) => {
  const status = error?.status ?? error?.response?.status;
  const code = error?.code ?? error?.error?.code ?? "unknown";
  const message = error?.message ?? error?.error?.message;
  const type = error?.type ?? error?.error?.type;
  const param = error?.param ?? error?.error?.param;

  if (isDevelopment) {
    console.warn("[ai] OpenAI request failed:", {
      status,
      code,
      message,
      type,
      param,
    });
    return;
  }

  console.warn("[ai] OpenAI request failed:", { status, code });
};

export const isOpenAIApiError = (error) =>
  Boolean(error?.status ?? error?.response?.status ?? error?.error);

export const isJsonFormatRequestError = (error) => {
  const status = error?.status ?? error?.response?.status;
  const message = String(error?.message ?? error?.error?.message ?? "");

  return (
    status === 400 &&
    /json|text\.format|format|invalid_request/i.test(message)
  );
};

export const mapOpenAIError = (error) => {
  logOpenAIError(error);
  return ApiError.internalServer(AI_SAFE_ERROR_MESSAGE);
};
