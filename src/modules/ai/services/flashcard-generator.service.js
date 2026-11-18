import ApiError from "../../../utils/ApiError.js";
import { resolveAccessibleContent } from "../shared/contentAccess.js";
import { extractDocumentText } from "../utils/documentTextExtractor.js";
import { extractFacts, isOutlineText } from "../../study-material/fact-extractor.js";
import { buildFlashcardDeck } from "../../study-material/study-items.js";

const resolveSubjectIdFromContent = (content) =>
  content?.subjectId ?? content?.subject_id ?? null;

export const generateFlashcardsFromNote = async (
  userId,
  role,
  documentId,
  { numberOfCards = 5, onProgress = () => {} } = {},
) => {
  onProgress({ stage: "reading" });
  const content = await resolveAccessibleContent(userId, role, documentId);
  const documentText = await extractDocumentText(content);
  const facts = extractFacts(documentText);

  // Slides with only titles and bullets have no facts but still give one card per list.
  const { cards, model } = await buildFlashcardDeck(
    facts,
    { numberOfCards, sources: [documentText] },
    { onProgress },
  );
  if (cards.length === 0) {
    throw ApiError.badRequest(
      isOutlineText(documentText)
        ? "This document looks like a course outline (chapter and lesson titles only). Add notes that explain the lessons to make flashcards."
        : "This document does not have facts that can become flashcards yet.",
    );
  }

  const subjectId = resolveSubjectIdFromContent(content);

  return {
    documentId: content.id,
    title: content.title?.trim() || "Untitled note",
    subjectId: subjectId || null,
    cards,
    // What wrote the deck, e.g. "ollama:qwen2.5:3b", "openai:…", or "study-facts" (no model).
    model,
  };
};
