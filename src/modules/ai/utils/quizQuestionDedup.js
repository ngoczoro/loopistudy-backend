export const normalizeQuestionKey = (text) =>
  String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const dedupeQuestions = (questions = []) => {
  const seen = new Set();
  const unique = [];

  for (const question of questions) {
    const key = normalizeQuestionKey(question?.question);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(question);
  }

  return unique;
};

export const mergeAvoidQuestionLists = (...lists) => {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    for (const item of list ?? []) {
      const key = normalizeQuestionKey(item);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(String(item).trim());
    }
  }

  return merged.slice(0, 20);
};
