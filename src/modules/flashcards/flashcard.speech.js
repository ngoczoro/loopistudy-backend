import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import ApiError from "../../utils/ApiError.js";
import { ipaToEspeak } from "./flashcard.phoneme.js";

const execFileAsync = promisify(execFile);

const INSTALL_HINT =
  "Pronunciation audio needs eSpeak NG on the server. macOS: brew install espeak-ng. Windows: install eSpeak NG and set ESPEAK_BIN in .env. Then restart the backend.";

let resolvedBinary = undefined;

const binaryCandidates = () =>
  [
    process.env.ESPEAK_BIN,
    "espeak-ng",
    "espeak",
    "/opt/homebrew/bin/espeak-ng",
    "/usr/local/bin/espeak-ng",
    "/usr/bin/espeak-ng",
  ].filter(Boolean);

export const resolveEspeak = async () => {
  if (resolvedBinary) return resolvedBinary;

  for (const bin of binaryCandidates()) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5000 });
      resolvedBinary = bin;
      return bin;
    } catch (error) {
      if (error?.code === "ENOENT") continue;
    }
  }

  throw new ApiError(503, INSTALL_HINT);
};

export const resetEspeakCache = () => {
  resolvedBinary = undefined;
};

const cleanEspeakIpa = (raw) => {
  const body = String(raw ?? "")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\/|\/$/g, "");
  return body ? `/${body}/` : null;
};

export const ipaFromEspeak = async (text) => {
  const bin = await resolveEspeak();
  const voice = process.env.ESPEAK_VOICE || "en-us";
  try {
    const { stdout } = await execFileAsync(bin, ["-q", "--ipa", "-v", voice, text], {
      timeout: 10000,
    });
    return cleanEspeakIpa(stdout);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("eSpeak IPA failed:", error?.message);
    throw new ApiError(503, INSTALL_HINT);
  }
};

export const writePronunciationWav = async (destPath, { text, ipa }) => {
  const bin = await resolveEspeak();
  const voice = process.env.ESPEAK_VOICE || "en-us";
  const phonemes = ipaToEspeak(ipa);
  if (!phonemes) throw ApiError.badRequest("Could not build a pronunciation for that text.");

  const spoken = `[[${phonemes}]]`;
  const tempPath = `${destPath}.${process.pid}.tmp.wav`;

  try {
    await execFileAsync(bin, ["-v", voice, "-s", "140", "-w", tempPath, spoken], {
      timeout: 15000,
    });
    const size = fs.statSync(tempPath).size;
    if (size < 1000) {
      throw new Error(`eSpeak wrote an empty wav for "${text}"`);
    }
    await fs.promises.rename(tempPath, destPath);
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    if (error instanceof ApiError) throw error;
    console.error("eSpeak wav failed:", error?.message);
    throw new ApiError(503, INSTALL_HINT);
  }
};
