import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const envCandidates = [
  path.resolve(projectRoot, ".env"),
  path.resolve(process.cwd(), ".env"),
];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));

if (envPath) {
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error("Failed to load .env:", result.error.message);
  }
} else {
  console.warn(
    "Warning: .env file not found. Checked:",
    envCandidates.join(", "),
  );
}

export const loadedEnvPath = envPath ?? null;
