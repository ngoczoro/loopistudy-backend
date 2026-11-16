import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(moduleDir, "../../..");

export const CMUDICT_PATH = path.join(moduleDir, "data", "cmudict.dict");
export const FLASHCARD_IMAGE_DIR = path.join(backendRoot, "uploads", "flashcards");
export const PRONUNCIATION_DIR = path.join(backendRoot, "uploads", "pronunciations");

for (const dir of [FLASHCARD_IMAGE_DIR, PRONUNCIATION_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}
