#!/usr/bin/env node
/**
 * Feasibility check for the Google Meet fallback: can this account create meeting
 * spaces through the Meet REST API, and are they open to anyone with the link?
 *
 *   node scripts/google-meet-spike.js <credentials.env> [count=2]
 *
 * <credentials.env> is the file written by scripts/google-meet-auth.js.
 */
import fs from "fs";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";

const MEET_API = "https://meet.googleapis.com/v2";

const [envFile, countArg = "2"] = process.argv.slice(2);
if (!envFile) {
  console.error("Usage: node scripts/google-meet-spike.js <credentials.env> [count]");
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envFile));
const missing = ["GOOGLE_MEET_CLIENT_ID", "GOOGLE_MEET_CLIENT_SECRET", "GOOGLE_MEET_REFRESH_TOKEN"].filter(
  (key) => !env[key],
);
if (missing.length) {
  console.error(`Missing in ${envFile}: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new OAuth2Client(env.GOOGLE_MEET_CLIENT_ID, env.GOOGLE_MEET_CLIENT_SECRET);
client.setCredentials({ refresh_token: env.GOOGLE_MEET_REFRESH_TOKEN });

const describeError = (error) => {
  const data = error.response?.data;
  const status = error.response?.status ?? "no status";
  return `${status} ${data?.error?.status ?? ""} ${data?.error?.message ?? data?.error_description ?? error.message}`.trim();
};

const count = Math.max(1, Math.min(5, Number.parseInt(countArg, 10) || 2));
let failures = 0;

for (let index = 1; index <= count; index += 1) {
  const started = Date.now();
  try {
    const { data: created } = await client.request({
      url: `${MEET_API}/spaces`,
      method: "POST",
      data: { config: { accessType: "OPEN" } },
    });
    const { data: fetched } = await client.request({ url: `${MEET_API}/${created.name}` });
    console.log(
      `#${index} ${created.meetingUri} | code ${created.meetingCode} | accessType ${fetched.config?.accessType ?? "?"} | ${Date.now() - started} ms`,
    );
  } catch (error) {
    failures += 1;
    console.error(`#${index} failed: ${describeError(error)}`);
  }
}

console.log(failures === 0 ? "\nRESULT: OK" : `\nRESULT: ${failures}/${count} failed`);
process.exitCode = failures === 0 ? 0 : 1;
