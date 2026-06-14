const QUIZ_TITLE_MAX_LENGTH = 200;

/**
 * Resolve a unique quiz title for a user.
 * Example: "Quiz" → "Quiz (1)" → "Quiz (2)" when duplicates exist.
 */
export const resolveUniqueQuizTitle = (proposedTitle, existingTitles) => {
  const titles =
    existingTitles instanceof Set
      ? existingTitles
      : new Set(existingTitles ?? []);

  const base = String(proposedTitle ?? "").trim().slice(0, QUIZ_TITLE_MAX_LENGTH);
  const safeBase = base || "Quiz";

  if (!titles.has(safeBase)) {
    return safeBase;
  }

  for (let suffix = 1; suffix < 10000; suffix += 1) {
    const suffixText = ` (${suffix})`;
    const allowedBaseLength = QUIZ_TITLE_MAX_LENGTH - suffixText.length;
    const candidate = `${safeBase.slice(0, allowedBaseLength)}${suffixText}`;

    if (!titles.has(candidate)) {
      return candidate;
    }
  }

  const fallbackSuffix = ` (${Date.now()})`;
  return `${safeBase.slice(0, QUIZ_TITLE_MAX_LENGTH - fallbackSuffix.length)}${fallbackSuffix}`;
};
