import ApiError from "../../../utils/ApiError.js";
import { getById as getSubjectById } from "../../subjects/index.js";
import * as contentRepository from "../../content/content.repository.js";
import * as quizGeneratorRepository from "../repositories/quiz-generator.repository.js";
import { resolveAccessibleContent } from "../shared/contentAccess.js";
import { serializeGeneratedQuiz } from "../serializers/quiz-generator.serializer.js";
import { extractDocumentText } from "../utils/documentTextExtractor.js";
import { mergeAvoidQuestionLists } from "../utils/quizQuestionDedup.js";
import { resolveUniqueQuizTitle } from "../utils/quizTitle.js";
import {
  extractFactsFromSources,
  isOutlineText,
  keepTopFacts,
  selectFactsInPassages,
} from "../../study-material/fact-extractor.js";
import { assistantService } from "../../assistant/index.js";
import { rankByTopic } from "../utils/topicMatch.js";
import { buildQuizFromFacts } from "../../study-material/study-items.js";

const NOT_ENOUGH_FACTS =
  "Need at least 4 distinct facts in your notes to build a quiz. Add a few terms and definitions, then try again.";
const OUTLINE_ONLY =
  "These notes look like a course outline (chapter and lesson titles only), so there is nothing to quiz on yet. Add notes that explain the lessons, then try again.";

const notEnoughFactsError = (documentTexts) =>
  ApiError.badRequest(
    documentTexts.some((text) => isOutlineText(text)) ? OUTLINE_ONLY : NOT_ENOUGH_FACTS,
  );

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

/** Text of the first 6 readable items, one entry per item so facts can be balanced across them. */
const collectDocumentTexts = async (items) => {
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
  return parts;
};

/**
 * Facts about `topic` found through the Ask AI index (keyword + embedding search), plus the
 * full text of the notes they came from (`sources`, for list questions).
 * Null when the index has nothing relevant or too few facts, so the caller falls back
 * to keyword ranking of whole notes.
 */
const factsForTopic = async (userId, items, { subjectId = null, topic, numberOfQuestions }) => {
  let passages = [];
  try {
    passages = await assistantService.findTopicPassages(userId, { subjectId, topic });
  } catch (error) {
    console.warn("Quiz topic search unavailable, using keyword match:", error.message);
    return null;
  }
  if (!passages.length) return null;

  const byId = new Map(items.map((item) => [item.id, item]));
  const documents = [];
  for (const id of new Set(passages.map((passage) => passage.contentId))) {
    const item = byId.get(id);
    if (!item) continue;
    try {
      const text = await extractDocumentText(item);
      documents.push({ id, text: `# ${item.title?.trim() || "Note"}\n${text}` });
    } catch {
      continue;
    }
  }

  const candidates = selectFactsInPassages(documents, passages, { limit: 80 });
  if (candidates.length < 4) return null;

  // Passages are coarse; rank each fact against the topic and keep the closest ones.
  const scores = await assistantService.scoreTextsForTopic(
    topic,
    candidates.map((fact) => fact.sentence),
  );
  const sources = documents.map((doc) => doc.text);
  if (!scores) return { facts: keepTopFacts(candidates, [], { max: 30 }), sources };
  return {
    facts: keepTopFacts(candidates, scores, { min: Math.max(8, numberOfQuestions + 3) }),
    sources,
  };
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
  documentTexts = [],
  facts: preselectedFacts = null,
  title,
  difficulty,
  numberOfQuestions,
  forceRegenerate,
  cacheLookup,
  avoidLookup,
  onProgress = () => {},
}) => {
  if (!forceRegenerate && cacheLookup) {
    const existing = await quizGeneratorRepository.findExistingAiQuiz(cacheLookup);
    if (existing) return serializeGeneratedQuiz(existing, difficulty);
  }

  // No minimum here: slides with only titles and bullets have few facts but still give list
  // questions. Too little material shows up as an empty quiz below.
  const facts = preselectedFacts ?? extractFactsFromSources(documentTexts);

  const avoidQuestions = mergeAvoidQuestionLists(
    await quizGeneratorRepository.findPreviousQuestionTexts(avoidLookup),
  );

  const normalized = await buildQuizFromFacts(facts, {
    numberOfQuestions,
    difficulty,
    title,
    avoidQuestions,
    sources: documentTexts,
  }, { onProgress });

  if (!normalized.questions.length) throw notEnoughFactsError(documentTexts);

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
  options.onProgress?.({ stage: "reading" });

  const content = await resolveAccessibleContent(userId, role, documentId);
  const subjectId = resolveSubjectIdFromContent(content);
  const documentText = await extractDocumentText(content);

  return generateAndSaveQuiz({
    onProgress: options.onProgress,
    userId,
    subjectId,
    sourceDocumentId: documentId,
    documentTexts: [documentText],
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
  options.onProgress?.({ stage: "reading" });

  const subject = await getSubjectById(userId, subjectId);
  const items = await contentRepository.findBySubjectId(userId, subjectId);
  const topic = String(options.topic ?? "").trim();

  // 1) Passages about the topic from the search index. 2) Notes mentioning the topic.
  // 3) The whole subject.
  const onTopicFacts = topic
    ? await factsForTopic(userId, items, { subjectId, topic, numberOfQuestions })
    : null;
  const facts = onTopicFacts?.facts ?? null;
  let documentTexts = onTopicFacts?.sources ?? [];
  if (!facts) {
    const onTopic = rankByTopic(items, topic);
    documentTexts = await collectDocumentTexts(onTopic.length ? onTopic : items);
    if (!documentTexts.length) {
      throw ApiError.badRequest(
        "Add a note or file in this subject before generating a quiz.",
      );
    }
  }

  return generateAndSaveQuiz({
    onProgress: options.onProgress,
    userId,
    subjectId,
    facts,
    documentTexts,
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
  options.onProgress?.({ stage: "reading" });
  const topic = String(options.topic ?? "").trim();

  if (!topic) {
    throw ApiError.badRequest("Topic is required to generate a practice quiz.");
  }

  const subjectId = options.subjectId ?? null;

  const items = await contentRepository.findAllByUserId(
    userId,
    subjectId ? { subjectId } : {},
  );
  // Search-index passages first; notes mentioning the topic as fallback.
  const onTopicFacts = await factsForTopic(userId, items, { subjectId, topic, numberOfQuestions });
  const facts = onTopicFacts?.facts ?? null;
  let documentTexts = onTopicFacts?.sources ?? [];
  if (!facts) {
    documentTexts = await collectDocumentTexts(rankByTopic(items, topic));
    if (!documentTexts.length) {
      throw ApiError.badRequest(
        "No note or file matches that topic. Add study material first.",
      );
    }
  }

  let title = topic;
  if (subjectId) {
    const subject = await getSubjectById(userId, subjectId);
    title = subject.name;
  }

  return generateAndSaveQuiz({
    onProgress: options.onProgress,
    userId,
    subjectId,
    facts,
    documentTexts,
    title,
    difficulty,
    numberOfQuestions,
    forceRegenerate,
    avoidLookup: subjectId ? { userId, subjectId } : { userId, subjectId: null },
  });
};
