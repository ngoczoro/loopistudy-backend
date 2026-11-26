import { Router } from "express";
import { invalidRequest } from "../errors.js";
import { EMBEDDING_LIMITS } from "./info.js";

const MODES = new Set(["query", "passage"]);

const readBody = (body) => {
  const { texts, mode } = body ?? {};
  if (!Array.isArray(texts) || texts.length === 0) {
    throw invalidRequest("texts must be a non-empty array of strings");
  }
  if (texts.length > EMBEDDING_LIMITS.maxTexts) {
    throw invalidRequest(`texts can hold at most ${EMBEDDING_LIMITS.maxTexts} items`);
  }
  if (!texts.every((text) => typeof text === "string")) {
    throw invalidRequest("every item in texts must be a string");
  }
  if (!MODES.has(mode)) throw invalidRequest('mode must be "query" or "passage"');
  return { texts, mode };
};

/** POST /v1/embed (API.md). Longer texts are cut to 8000 characters by the embedder. */
export const embedRouter = ({ embedder }) => {
  const router = Router();
  router.post("/v1/embed", async (req, res) => {
    const { texts, mode } = readBody(req.body);
    res.json(await embedder.embed(texts, mode));
  });
  return router;
};
