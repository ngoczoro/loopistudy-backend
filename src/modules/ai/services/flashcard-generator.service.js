import { CONTENT_TYPE } from "../../../config/constants.js";
import ApiError from "../../../utils/ApiError.js";
import { getById as getSubjectById } from "../../subjects/index.js";
import { getOpenAIConfig } from "../ai.constants.js";
import { buildDocumentFlashcardPrompt } from "../prompts/flashcard.prompt.js";
import * as summaryRepository from "../repositories/summary.repository.js";
import { resolveAccessibleContent } from "../shared/contentAccess.js";
import * as aiProviderService from "./ai.provider.service.js";
import { extractDocumentText } from "../utils/documentTextExtractor.js";

const FRONT_MAX = 500;
const BACK_MAX = 2000;

const resolveSubjectIdFromContent = (content) =>
  content?.subjectId ?? content?.subject_id ?? null;

const buildSummaryContext = (summaryRecord) => {
  if (!summaryRecord) return null;

  return {
    summary: summaryRecord.summary,
    keyPoints: summaryRecord.keyPoints ?? summaryRecord.key_points ?? [],
  };
};

const normalizeCard = (raw) => {
  const front = String(raw?.front ?? "").replace(/\s+/g, " ").trim();
  const back = String(raw?.back ?? "").replace(/\s+/g, " ").trim();
  if (!front || !back || front.toLowerCase() === back.toLowerCase()) return null;

  return {
    front: front.slice(0, FRONT_MAX),
    back: back.slice(0, BACK_MAX),
  };
};

const dedupeCards = (cards) => {
  const seen = new Set();
  return cards.filter((card) => {
    const key = card.front.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeCards = (payload, numberOfCards) => {
  if (!Array.isArray(payload?.cards)) return [];

  return dedupeCards(
    payload.cards.map((item) => normalizeCard(item)).filter(Boolean),
  ).slice(0, numberOfCards);
};

const estimateMaxOutputTokens = (numberOfCards) =>
  Math.min(8000, 600 + numberOfCards * 220);

const requestCards = async ({
  documentTitle,
  documentText,
  summaryContext,
  subjectName,
  numberOfCards,
  avoidFronts,
  strictRetry,
}) => {
  const prompt = buildDocumentFlashcardPrompt({
    documentTitle,
    documentText,
    summaryContext,
    subjectName,
    numberOfCards,
    avoidFronts,
  });
  const { model } = getOpenAIConfig();
  const aiResult = await aiProviderService.generateJson({
    instructions: prompt.instructions,
    input: prompt.input,
    model,
    temperature: strictRetry ? 0.35 : 0.4,
    maxOutputTokens: estimateMaxOutputTokens(numberOfCards),
  });

  return normalizeCards(aiResult, numberOfCards);
};

export const generateFlashcardsFromNote = async (
  userId,
  role,
  documentId,
  { numberOfCards = 5 } = {},
) => {
  const content = await resolveAccessibleContent(userId, role, documentId);

  if (content.type !== CONTENT_TYPE.NOTE) {
    throw ApiError.badRequest("Flashcards can only be generated from a note.");
  }

  const documentText = await extractDocumentText(content);
  const summaryRecord = await summaryRepository.findByDocumentId(documentId);
  const summaryContext = buildSummaryContext(summaryRecord);
  const subjectId = resolveSubjectIdFromContent(content);
  const subjectName =
    subjectId != null
      ? (await getSubjectById(userId, subjectId).catch(() => null))?.name ?? ""
      : "";

  const promptParams = {
    documentTitle: content.title,
    documentText,
    summaryContext,
    subjectName,
    numberOfCards,
  };

  let cards = await requestCards(promptParams);

  if (cards.length < numberOfCards) {
    try {
      const extra = await requestCards({
        ...promptParams,
        avoidFronts: cards.map((card) => card.front),
        strictRetry: true,
      });
      cards = dedupeCards([...cards, ...extra]).slice(0, numberOfCards);
    } catch (error) {
      if (cards.length === 0) throw error;
    }
  }

  if (cards.length === 0) {
    throw ApiError.internalServer(
      "AI returned no usable flashcards. Please try again later.",
    );
  }

  return {
    documentId: content.id,
    title: content.title?.trim() || "Untitled note",
    subjectId: subjectId || null,
    cards,
  };
};
