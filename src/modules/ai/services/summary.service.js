import ApiError from "../../../utils/ApiError.js";
import { ROLES } from "../../../config/constants.js";
import { contentService } from "../../content/index.js";
import { serializeContentItem } from "../../content/content.serializer.js";
import { getOpenAIConfig } from "../ai.constants.js";
import { buildSummaryPrompt } from "../prompts/summary.prompt.js";
import * as summaryRepository from "../repositories/summary.repository.js";
import { serializeDocumentSummary } from "../serializers/summary.serializer.js";
import * as aiProviderService from "./ai.provider.service.js";
import { extractDocumentText } from "../utils/documentTextExtractor.js";

const normalizeStringArray = (value, { maxItems = 20, maxLength = 500 } = {}) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
};

const validateAiSummaryPayload = (payload) => {
  const summary = String(payload?.summary ?? "").trim();

  if (!summary) {
    throw ApiError.internalServer(
      "AI returned an invalid summary. Please try again later.",
    );
  }

  return {
    summary,
    keyPoints: normalizeStringArray(payload?.keyPoints, { maxItems: 8 }),
    learningNotes: normalizeStringArray(payload?.learningNotes, { maxItems: 5 }),
    keywords: normalizeStringArray(payload?.keywords, { maxItems: 10 }),
  };
};

const resolveAccessibleContent = async (userId, role, documentId) => {
  if (role === ROLES.ADMIN) {
    const item = await contentService.getByIdForAdmin(documentId);
    return serializeContentItem(item);
  }

  return contentService.getById(userId, documentId);
};

export const getExistingSummary = async (userId, role, documentId) => {
  await resolveAccessibleContent(userId, role, documentId);

  const existing = await summaryRepository.findByDocumentId(documentId);
  if (!existing) {
    throw ApiError.notFound("AI summary not found for this document");
  }

  return serializeDocumentSummary(existing);
};

export const generateDocumentSummary = async (
  userId,
  role,
  documentId,
  { forceRegenerate = false } = {},
) => {
  const content = await resolveAccessibleContent(userId, role, documentId);

  if (!forceRegenerate) {
    const existing = await summaryRepository.findByDocumentId(documentId);
    if (existing) {
      return serializeDocumentSummary(existing);
    }
  }

  const documentText = await extractDocumentText(content);
  const prompt = buildSummaryPrompt({
    documentTitle: content.title,
    subjectName: "",
    documentText,
  });

  const { model } = getOpenAIConfig();
  const aiResult = await aiProviderService.generateJson({
    instructions: prompt.instructions,
    input: prompt.input,
    model,
    temperature: 0.2,
    maxOutputTokens: 2000,
  });

  const normalized = validateAiSummaryPayload(aiResult);

  const saved = await summaryRepository.upsertSummary(documentId, {
    summary: normalized.summary,
    keyPoints: normalized.keyPoints,
    learningNotes: normalized.learningNotes,
    keywords: normalized.keywords,
    model,
    createdBy: userId,
  });

  return serializeDocumentSummary(saved);
};
