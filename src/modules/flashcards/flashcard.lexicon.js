import fs from "fs";
import { arpabetToIpa, normalizePronunciationText } from "./flashcard.phoneme.js";
import { CMUDICT_PATH } from "./flashcard.paths.js";

const MAX_SUGGESTIONS = 3;

let lexicon = null;

const parseCmudict = (text) => {
  const entries = new Map();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";;;")) continue;

    const [rawWord, ...phoneTokens] = trimmed.split(/\s+/);
    if (!rawWord || phoneTokens.length === 0) continue;

    const variantMatch = rawWord.match(/^(.*)\((\d+)\)$/);
    const word = (variantMatch ? variantMatch[1] : rawWord).toLowerCase();
    const variant = variantMatch ? Number(variantMatch[2]) : 1;
    const ipa = arpabetToIpa(phoneTokens.join(" "));
    if (!word || !ipa) continue;

    const current = entries.get(word) ?? [];
    if (!current.some((item) => item.variant === variant)) {
      current.push({ variant, ipa });
      entries.set(word, current);
    }
  }

  for (const [word, variants] of entries) {
    variants.sort((left, right) => left.variant - right.variant);
    entries.set(word, variants.slice(0, MAX_SUGGESTIONS));
  }

  return entries;
};

const getLexicon = () => {
  if (!lexicon) {
    lexicon = parseCmudict(fs.readFileSync(CMUDICT_PATH, "utf8"));
  }
  return lexicon;
};

const wordVariants = (word) => getLexicon().get(word)?.map((item) => item.ipa) ?? [];

/** Up to 3 IPA strings for a normalized English word or short phrase. Empty when unknown. */
export const lookupPronunciations = (text) => {
  const normalized = normalizePronunciationText(text);
  if (!normalized) return [];

  const perWord = normalized.split(" ").map(wordVariants);
  if (perWord.some((variants) => variants.length === 0)) return [];

  const suggestions = [];
  const walk = (index, parts) => {
    if (suggestions.length >= MAX_SUGGESTIONS) return;
    if (index === perWord.length) {
      suggestions.push(`/${parts.join(" ").replace(/\//g, "")}/`);
      return;
    }
    for (const ipa of perWord[index]) {
      walk(index + 1, [...parts, ipa]);
      if (suggestions.length >= MAX_SUGGESTIONS) return;
    }
  };

  walk(0, []);
  return suggestions;
};

export const resetLexiconCache = () => {
  lexicon = null;
};
