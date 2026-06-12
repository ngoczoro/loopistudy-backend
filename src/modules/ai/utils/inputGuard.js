import { MAX_AI_INPUT_CHARS } from "../ai.constants.js";

export const truncateInput = (input, maxLength = MAX_AI_INPUT_CHARS) => {
  const text = String(input ?? "");
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
};
