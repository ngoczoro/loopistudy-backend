import ApiError from "../../../utils/ApiError.js";
import { getById as getSubjectById } from "../../subjects/index.js";
import * as contentRepository from "../../content/content.repository.js";
import * as quizGeneratorRepository from "../repositories/quiz-generator.repository.js";
import { resolveAccessibleContent } from "../shared/contentAccess.js";
import { serializeGeneratedQuiz } from "../serializers/quiz-generator.serializer.js";
import { extractDocumentText } from "../utils/documentTextExtractor.js";
import { mergeAvoidQuestionLists } from "../utils/quizQuestionDedup.js";
import { resolveUniqueQuizTitle } from "../utils/quizTitle.js";
import { extractFacts } from "../../study-material/fact-extractor.js";
import { buildQuizFromFacts } from "../../study-material/study-items.js";

const NOT_ENOUGH_FACTS =
  "Need at least 4 distinct facts in your notes to build a quiz. Add a few terms and definitions, then try again.";

const resolveSubjectIdFromContent = (content) =>
  content?.subjectId ?? content?.subject_id ?? null;

const resolveGenerationOptions = ({
  difficulty = "mixed",
  numberOfQuestions = 5,
  forceRegenerate = true,
} = {}) => ({
  difficulty,
  numberOfQuestions,
  forceRegenerate: forceRegenerate !== false,
});

const collectDocumentText = async (items) => {
  const parts = [];
  for (const item of items) {
    if (parts.length >= 6) break;
    try {
      const text = await extractDocumentText(item);
      const title = item.title?.trim() || "Note";
      parts.push(`# ${title}\n${text}`);
    } catch {
      continue;
    }
  }
  return parts.join("\n\n");
};

const topicMatches = (item, tokens) => {
  const haystack = `${item.title ?? ""} ${item.description ?? ""} ${item.content ?? ""}`.toLowerCase();
  return tokens.some((token) => haystack.includes(token));
};

const persistGeneratedQuiz = async ({
  userId,
  subjectId,
  normalized,
  sourceDocumentId = null,
  difficulty,
  numberOfQuestions,
  model,
}) => {
  const existingTitles = await quizGeneratorRepository.findUserQuizTitles(userId);
  const uniqueTitle = resolveUniqueQuizTitle(
    normalized.title,
    new Set(existingTitles),
  );

  return quizGeneratorRepository.createAiQuiz({
    userId,
    subjectId,
    title: uniqueTitle,
    description: normalized.description,
    questions: normalized.questions,
    source: "ai_generated",
    sourceDocumentId,
    aiModel: model,
    generationDifficulty: difficulty,
    generationQuestionCount: numberOfQuestions,
  });
};

const generateAndSaveQuiz = async ({
  userId,
  subjectId,
  sourceDocumentId = null,
  documentText,
  title,
  difficulty,
  numberOfQuestions,
  forceRegenerate,
  cacheLookup,
  avoidLookup,
}) => {
  if (!forceRegenerate && cacheLookup) {
    const existing = await quizGeneratorRepository.findExistingAiQuiz(cacheLookup);
    if (existing) return serializeGeneratedQuiz(existing, difficulty);
  }

  const facts = extractFacts(documentText);
  if (facts.length < 4) throw ApiError.badRequest(NOT_ENOUGH_FACTS);

  const avoidQuestions = mergeAvoidQuestionLists(
    await quizGeneratorRepository.findPreviousQuestionTexts(avoidLookup),
  );

  const normalized = await buildQuizFromFacts(facts, {
    numberOfQuestions,
    difficulty,
    title,
    avoidQuestions,
  });

  if (!normalized.questions.length) throw ApiError.badRequest(NOT_ENOUGH_FACTS);

  const saved = await persistGeneratedQuiz({
    userId,
    subjectId,
    normalized,
    sourceDocumentId,
    difficulty,
    numberOfQuestions: normalized.questions.length,
    model: normalized.model,
  });

  return serializeGeneratedQuiz(saved, difficulty);
};

export const generateQuizFromDocument = async (
  userId,
  role,
  documentId,
  options = {},
) => {
  const { difficulty, numberOfQuestions, forceRegenerate } =
    resolveGenerationOptions(options);

  const content = await resolveAccessibleContent(userId, role, documentId);
  const subjectId = resolveSubjectIdFromContent(content);
  const documentText = await extractDocumentText(content);

  return generateAndSaveQuiz({
    userId,
    subjectId,
    sourceDocumentId: documentId,
    documentText,
    title: content.title,
    difficulty,
    numberOfQuestions,
    forceRegenerate,
    cacheLookup: {
      userId,
      sourceDocumentId: documentId,
      difficulty,
      questionCount: numberOfQuestions,
    },
    avoidLookup: {
      userId,
      sourceDocumentId: documentId,
    },
  });
};

export const generateQuizFromSubject = async (
  userId,
  subjectId,
  options = {},
) => {
  const { difficulty, numberOfQuestions, forceRegenerate } =
    resolveGenerationOptions(options);

  const subject = await getSubjectById(userId, subjectId);
  const items = await contentRepository.findBySubjectId(userId, subjectId);
  const documentText = await collectDocumentText(items);
  if (!documentText) {
    throw ApiError.badRequest(
      "Add a note or file in this subject before generating a quiz.",
    );
  }

  return generateAndSaveQuiz({
    userId,
    subjectId,
    documentText,
    title: subject.name,
    difficulty,
    numberOfQuestions,
    forceRegenerate,
    avoidLookup: { userId, subjectId },
  });
};

export const generatePracticeQuiz = async (userId, options = {}) => {
  const { difficulty, numberOfQuestions, forceRegenerate } =
    resolveGenerationOptions(options);
  const topic = String(options.topic ?? "").trim();

  if (!topic) {
    throw ApiError.badRequest("Topic is required to generate a practice quiz.");
  }

  const subjectId = options.subjectId ?? null;
  const tokens = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 1);

  const items = await contentRepository.findAllByUserId(
    userId,
    subjectId ? { subjectId } : {},
  );
  const matched = tokens.length
    ? items.filter((item) => topicMatches(item, tokens))
    : items;
  const documentText = await collectDocumentText(matched);

  if (!documentText) {
    throw ApiError.badRequest(
      "No note or file matches that topic. Add study material first.",
    );
  }

  let title = topic;
  if (subjectId) {
    const subject = await getSubjectById(userId, subjectId);
    title = subject.name;
  }

  return generateAndSaveQuiz({
    userId,
    subjectId,
    documentText,
    title,
    difficulty,
    numberOfQuestions,
    forceRegenerate,
    avoidLookup: subjectId ? { userId, subjectId } : { userId, subjectId: null },
  });
};
