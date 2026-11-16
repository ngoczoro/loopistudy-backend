import crypto from "crypto";
import fs from "fs";
import path from "path";
import ApiError from "../../utils/ApiError.js";
import { lookupPronunciations } from "./flashcard.lexicon.js";
import { normalizePronunciationText } from "./flashcard.phoneme.js";
import { PRONUNCIATION_DIR } from "./flashcard.paths.js";
import { ipaFromEspeak, writePronunciationWav } from "./flashcard.speech.js";

const audioPathFor = (ipa) => {
  const hash = crypto.createHash("sha256").update(`en\n${ipa}`).digest("hex").slice(0, 24);
  return {
    filename: `${hash}.wav`,
    pathname: `/media/pronunciations/${hash}.wav`,
    filePath: path.join(PRONUNCIATION_DIR, `${hash}.wav`),
  };
};

const ensureAudio = async (text, ipa) => {
  const target = audioPathFor(ipa);
  if (!fs.existsSync(target.filePath)) {
    await writePronunciationWav(target.filePath, { text, ipa });
  }
  return target.pathname;
};

export const suggestPronunciations = async (text) => {
  const normalized = normalizePronunciationText(text);
  if (!normalized) {
    throw ApiError.badRequest("Enter 1 to 4 English words to look up a pronunciation.");
  }

  let phonetics = lookupPronunciations(normalized);
  if (phonetics.length === 0) {
    const spoken = await ipaFromEspeak(normalized);
    if (!spoken) {
      throw ApiError.badRequest("No pronunciation found for that text.");
    }
    phonetics = [spoken];
  }

  const suggestions = [];
  for (const phonetic of phonetics) {
    const audioPath = await ensureAudio(normalized, phonetic);
    suggestions.push({
      phonetic,
      audioPath,
      lang: "en",
    });
  }

  return { text: normalized, suggestions };
};
