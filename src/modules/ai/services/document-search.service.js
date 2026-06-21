import ApiError from "../../../utils/ApiError.js";
import { getById as getSubjectById } from "../../subjects/index.js";
import { getOpenAIConfig } from "../ai.constants.js";
import {
  buildDocumentSearchExplainPrompt,
  NOT_ENOUGH_INFO_MESSAGE,
} from "../prompts/document-search.prompt.js";
import * as documentSearchRepository from "../repositories/document-search.repository.js";
import {
  serializeDocumentSearchExplainResult,
  serializeDocumentSearchResult,
} from "../serializers/document-search.serializer.js";
import { resolveAccessibleContent } from "../shared/contentAccess.js";
import * as aiProviderService from "./ai.provider.service.js";
import { extractDocumentText } from "../utils/documentTextExtractor.js";
import { truncateInput } from "../utils/inputGuard.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const PASSAGE_MIN_CHARS = 60;
const PASSAGE_MAX_CHARS = 900;
const PASSAGE_AI_MAX_CHARS = 800;
const EXCERPT_DISPLAY_MAX = 320;
const MIN_SCORE = 0.15;

const VIETNAMESE_STOP_WORDS = new Set([
  "la",
  "là",
  "gi",
  "gì",
  "la gi",
  "là gì",
  "the",
  "a",
  "an",
  "is",
  "are",
  "what",
  "how",
  "why",
  "when",
  "where",
  "trong",
  "cua",
  "của",
  "va",
  "và",
  "mot",
  "một",
  "cho",
  "duoc",
  "được",
  "dung",
  "dùng",
  "de",
  "để",
]);

const resolveLimit = (limit) => {
  const value = Number(limit ?? DEFAULT_LIMIT);
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(value)));
};

const normalizeText = (text) =>
  String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !VIETNAMESE_STOP_WORDS.has(term));
};

const chunkLongText = (text, chunkSize = PASSAGE_MAX_CHARS) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const slice = text.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf("\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
      );

      if (breakAt > chunkSize * 0.4) {
        end = start + breakAt + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= PASSAGE_MIN_CHARS) {
      chunks.push(chunk);
    }

    start = end;
  }

  return chunks;
};

export const splitIntoPassages = (text) => {
  const normalized = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const passages = [];
  let buffer = "";

  const flushBuffer = () => {
    const value = buffer.trim();
    if (value.length >= PASSAGE_MIN_CHARS) {
      passages.push(value);
    }
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > PASSAGE_MAX_CHARS) {
      flushBuffer();
      passages.push(...chunkLongText(paragraph));
      continue;
    }

    const next = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (next.length > PASSAGE_MAX_CHARS) {
      flushBuffer();
      buffer = paragraph;
    } else {
      buffer = next;
    }

    if (buffer.length >= PASSAGE_MIN_CHARS) {
      flushBuffer();
    }
  }

  flushBuffer();

  return passages.flatMap((passage) =>
    passage.length > PASSAGE_MAX_CHARS ? chunkLongText(passage) : [passage],
  );
};

export const scorePassage = (passage, query) => {
  const passageNorm = normalizeText(passage);
  const queryNorm = normalizeText(query);
  const queryTerms = tokenize(query);

  if (!passageNorm || !queryNorm) return 0;

  if (queryTerms.length === 0) {
    return passageNorm.includes(queryNorm) ? 1 : 0;
  }

  let matched = 0;
  for (const term of queryTerms) {
    if (passageNorm.includes(term)) {
      matched += 1;
    }
  }

  let score = matched / queryTerms.length;

  if (queryNorm.length >= 4 && passageNorm.includes(queryNorm)) {
    score = Math.min(1, score + 0.35);
  }

  return score;
};

const truncateExcerpt = (text, maxLength = EXCERPT_DISPLAY_MAX) => {
  const value = String(text ?? "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
};

const validateAiExplainPayload = (payload) => {
  const answer = String(payload?.answer ?? "").trim();
  const passageReasons = Array.isArray(payload?.passageReasons)
    ? payload.passageReasons
    : [];

  return {
    answer: answer || NOT_ENOUGH_INFO_MESSAGE,
    passageReasons: passageReasons
      .map((item) => ({
        documentId: String(item?.documentId ?? "").trim(),
        reason: String(item?.reason ?? "").trim().slice(0, 500),
      }))
      .filter((item) => item.documentId),
  };
};

const resolveTargetDocuments = async (
  userId,
  role,
  { documentId, subjectId },
) => {
  if (documentId) {
    const document = await resolveAccessibleContent(userId, role, documentId);
    let subjectName = "";

    if (document.subjectId) {
      try {
        const subject = await getSubjectById(userId, document.subjectId);
        subjectName = subject?.name ?? "";
      } catch {
        subjectName = "";
      }
    }

    return [{ ...document, subjectName }];
  }

  const subject = await getSubjectById(userId, subjectId);
  const documents = await documentSearchRepository.listDocumentsBySubject(
    userId,
    subjectId,
  );

  return documents.map((document) => ({
    ...document,
    subjectName: subject?.name ?? "",
  }));
};

const extractPassagesForDocument = async (document, subjectName = "") => {
  try {
    const text = await extractDocumentText(document);
    const passages = splitIntoPassages(text);

    return passages.map((excerpt) => ({
      documentId: document.id,
      documentTitle: document.title,
      subjectId: document.subjectId ?? null,
      subjectName: subjectName || document.subjectName || "",
      excerpt,
    }));
  } catch {
    return [];
  }
};

const rankPassages = (passages, query, limit) =>
  passages
    .map((passage) => ({
      ...passage,
      score: scorePassage(passage.excerpt, query),
    }))
    .filter((passage) => passage.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

const assertPassagesAccessible = async (userId, role, passages = []) => {
  const uniqueDocumentIds = [
    ...new Set(
      passages
        .map((item) => String(item?.documentId ?? "").trim())
        .filter(Boolean),
    ),
  ];

  if (!uniqueDocumentIds.length) {
    throw ApiError.badRequest("At least one passage is required");
  }

  const accessible = new Map();

  for (const documentId of uniqueDocumentIds) {
    const document = await resolveAccessibleContent(userId, role, documentId);
    accessible.set(documentId, document);
  }

  return passages.map((passage) => {
    const document = accessible.get(passage.documentId);
    return {
      documentId: passage.documentId,
      documentTitle: passage.documentTitle || document?.title || "",
      subjectId: passage.subjectId ?? document?.subjectId ?? null,
      subjectName: passage.subjectName ?? "",
      excerpt: String(passage.excerpt ?? "").trim(),
      score: passage.score,
    };
  });
};

export const searchDocuments = async (
  userId,
  role,
  { query, documentId, subjectId, limit } = {},
) => {
  const trimmedQuery = String(query ?? "").trim();
  if (!trimmedQuery) {
    throw ApiError.badRequest("Query is required");
  }

  if (!documentId && !subjectId) {
    throw ApiError.badRequest("Either documentId or subjectId is required");
  }

  const resolvedLimit = resolveLimit(limit);
  const documents = await resolveTargetDocuments(userId, role, {
    documentId,
    subjectId,
  });

  if (!documents.length) {
    return serializeDocumentSearchResult({ query: trimmedQuery, results: [] });
  }

  let subjectLookupName = documents[0]?.subjectName || "";
  if (!documentId && subjectId && !subjectLookupName) {
    const subject = await getSubjectById(userId, subjectId);
    subjectLookupName = subject?.name ?? "";
  }

  const allPassages = [];

  for (const document of documents) {
    const passages = await extractPassagesForDocument(
      document,
      document.subjectName || subjectLookupName,
    );
    allPassages.push(...passages);
  }

  const topPassages = rankPassages(allPassages, trimmedQuery, resolvedLimit).map(
    (passage) => ({
      ...passage,
      excerpt: truncateExcerpt(passage.excerpt),
    }),
  );

  return serializeDocumentSearchResult({
    query: trimmedQuery,
    results: topPassages,
  });
};

export const explainDocumentSearch = async (
  userId,
  role,
  { query, passages } = {},
) => {
  const trimmedQuery = String(query ?? "").trim();
  if (!trimmedQuery) {
    throw ApiError.badRequest("Query is required");
  }

  const verifiedPassages = await assertPassagesAccessible(
    userId,
    role,
    passages,
  );

  if (!verifiedPassages.length) {
    return serializeDocumentSearchExplainResult({
      query: trimmedQuery,
      answer: NOT_ENOUGH_INFO_MESSAGE,
      passageReasons: [],
    });
  }

  const promptPassages = verifiedPassages.map((passage) => ({
    ...passage,
    excerpt: truncateInput(passage.excerpt, PASSAGE_AI_MAX_CHARS),
  }));

  const prompt = buildDocumentSearchExplainPrompt({
    query: trimmedQuery,
    passages: promptPassages,
  });

  const { model } = getOpenAIConfig();
  const aiResult = await aiProviderService.generateJson({
    instructions: prompt.instructions,
    input: prompt.input,
    model,
    temperature: 0.1,
    maxOutputTokens: 1200,
  });

  const normalized = validateAiExplainPayload(aiResult);

  return serializeDocumentSearchExplainResult({
    query: trimmedQuery,
    answer: normalized.answer,
    passageReasons: normalized.passageReasons,
  });
};
