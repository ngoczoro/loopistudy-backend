export const parseJsonFromModelText = (text) => {
  const cleaned = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!cleaned) {
    throw new Error("Empty JSON response");
  }

  return JSON.parse(cleaned);
};

export const ensureJsonHintInInput = (input) => {
  const text = String(input ?? "").trim();
  if (/json/i.test(text)) return text;

  return `${text}\n\nRespond with a valid JSON object only (no markdown).`;
};

export const appendJsonOnlyInstruction = (instructions) => {
  const base = String(instructions ?? "").trim();
  if (/json/i.test(base)) return base;

  return `${base}\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown fences, no extra prose.`;
};
