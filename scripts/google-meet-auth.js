#!/usr/bin/env node
/**
 * One-time setup: get a Google refresh token that can create Google Meet spaces.
 *
 *   node scripts/google-meet-auth.js <oauth-client.json> <output.env>
 *
 * <oauth-client.json>  "Desktop app" OAuth client downloaded from Google Cloud Console.
 * <output.env>         Where to write GOOGLE_MEET_CLIENT_ID / _SECRET / _REFRESH_TOKEN.
 *                      The file is created with 600 permissions. Keep it out of git.
 *
 * Only the `meetings.space.created` scope is requested: the token can create meeting
 * spaces and manage the ones it created. It cannot read mail, Drive or other meetings.
 * Revoke it any time at https://myaccount.google.com/permissions.
 */
import crypto from "crypto";
import fs from "fs";
import http from "http";
import { execFile } from "child_process";
import { OAuth2Client } from "google-auth-library";

const SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
const TIMEOUT_MS = 10 * 60 * 1000;

const [clientFile, outFile] = process.argv.slice(2);
if (!clientFile || !outFile) {
  console.error("Usage: node scripts/google-meet-auth.js <oauth-client.json> <output.env>");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(clientFile, "utf8"));
const credentials = raw.installed ?? raw.web;
if (!credentials?.client_id || !credentials?.client_secret) {
  console.error("The client file has no client_id/client_secret. Download a 'Desktop app' OAuth client.");
  process.exit(1);
}

const server = http.createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

const client = new OAuth2Client(credentials.client_id, credentials.client_secret, redirectUri);
const state = crypto.randomBytes(16).toString("hex");
const authUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [SCOPE],
  state,
});

const finish = (code) => {
  server.close();
  clearTimeout(timer);
  process.exitCode = code;
};

const timer = setTimeout(() => {
  console.error("Timed out waiting for Google sign-in.");
  finish(1);
}, TIMEOUT_MS);

server.on("request", async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }

  const reply = (status, text) => {
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }).end(text);
  };

  if (url.searchParams.get("state") !== state) {
    reply(400, "State mismatch. Run the script again.");
    return;
  }
  if (url.searchParams.get("error")) {
    reply(400, `Google returned: ${url.searchParams.get("error")}`);
    console.error(`Sign-in was not completed: ${url.searchParams.get("error")}`);
    finish(1);
    return;
  }

  try {
    const { tokens } = await client.getToken(url.searchParams.get("code"));
    if (!tokens.refresh_token) {
      reply(500, "No refresh token returned. Remove the app's access at myaccount.google.com/permissions and run again.");
      console.error("No refresh token in the response.");
      finish(1);
      return;
    }

    const lines = [
      "# Google Meet API (created by scripts/google-meet-auth.js). Do not commit.",
      `GOOGLE_MEET_CLIENT_ID=${credentials.client_id}`,
      `GOOGLE_MEET_CLIENT_SECRET=${credentials.client_secret}`,
      `GOOGLE_MEET_REFRESH_TOKEN=${tokens.refresh_token}`,
      "",
    ];
    fs.writeFileSync(outFile, lines.join("\n"), { mode: 0o600 });
    fs.chmodSync(outFile, 0o600);

    reply(200, "Done. Loopi can now create Google Meet links. You can close this tab.");
    console.log(`Saved credentials to ${outFile}`);
    console.log(`Granted scope: ${tokens.scope}`);
    finish(0);
  } catch (error) {
    reply(500, "Could not exchange the code. Check the terminal.");
    console.error("Token exchange failed:", error.response?.data ?? error.message);
    finish(1);
  }
});

console.log("Sign in with the Google account that will own the meetings:\n");
console.log(authUrl);
console.log(`\nWaiting on ${redirectUri} ...`);
if (process.platform === "darwin") execFile("open", [authUrl], () => {});
