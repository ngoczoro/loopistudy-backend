import ApiError from "../../../utils/ApiError.js";
import { CONTENT_TYPE } from "../../../config/constants.js";
import { getExtension } from "../../../shared/utils/contentFileTypes.js";
import {
  fetchDocPreview,
  fetchExcelPreview,
  fetchTextContent,
} from "../../../services/contentPreview.service.js";
import * as contentRepository from "../../content/content.repository.js";
import { assertOwned as assertSubjectOwned } from "../../subjects/subject.service.js";
import { serializeSubject } from "../../subjects/subject.serializer.js";
import { toDateOnly } from "./ai-plan.weekUtils.js";
import { isAiPlanMockEnabled } from "./ai-plan.constants.js";

const CHAPTER_PATTERN = /^(?:chương|chapter|module|week|bài|unit)\s*[\d.:)-]/i;
const NUMBERED_SECTION = /^\d+[\).:\-]\s+\S+/;

const HARD_KEYWORDS = [
  "chứng minh",
  "proof",
  "advanced",
  "nâng cao",
  "calculus",
  "algorithm",
  "theorem",
  "research",
];

const EASY_KEYWORDS = [
  "giới thiệu",
  "introduction",
  "basic",
  "cơ bản",
  "overview",
  "fundamentals",
];

const extractExamDate = (text) => {
  const isoMatch = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const contextual = text.match(
    /(?:ngày thi|exam date|final exam|kết thúc(?: học phần)?|hết hạn)[^\d]{0,20}(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})/i,
  );
  if (contextual) {
    const [, day, month, year] = contextual;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
};

const extractTopics = (text) => {
  const topics = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) continue;
    if (CHAPTER_PATTERN.test(trimmed) || NUMBERED_SECTION.test(trimmed)) {
      topics.push(trimmed.replace(/\s+/g, " "));
    }
  }

  return [...new Set(topics)].slice(0, 12);
};

const estimateDifficulty = (text, topicCount) => {
  const lower = text.toLowerCase();
  const hardHits = HARD_KEYWORDS.filter((word) => lower.includes(word)).length;
  const easyHits = EASY_KEYWORDS.filter((word) => lower.includes(word)).length;

  if (hardHits >= 2 || topicCount >= 10) return "Hard";
  if (easyHits >= 2 && topicCount <= 4) return "Easy";
  if (hardHits > easyHits) return "Hard";
  if (easyHits > hardHits) return "Easy";
  return "Medium";
};

const estimateHoursPerWeek = (text, topicCount, difficulty) => {
  const creditMatch = text.match(/(\d+)\s*(?:credits?|tín chỉ)/i);
  if (creditMatch) {
    return Math.min(12, Math.max(3, Number(creditMatch[1]) * 1.5));
  }

  const base = topicCount > 0 ? Math.ceil(topicCount * 0.6) : 4;
  const difficultyBonus = difficulty === "Hard" ? 2 : difficulty === "Easy" ? -1 : 0;
  return Math.min(12, Math.max(3, base + difficultyBonus));
};

const buildRationale = ({ difficulty, hoursPerWeek, topicCount, examDate }) => {
  const parts = [
    `Detected ${topicCount || "several"} major section(s) in the document.`,
    `Suggested workload: ${hoursPerWeek}h/week for a ${difficulty.toLowerCase()} course.`,
  ];

  if (examDate) {
    parts.push(`Found a likely exam/end date on ${examDate}.`);
  } else {
    parts.push("No exam date was found in the document.");
  }

  return parts.join(" ");
};

export const extractDocumentText = async (item) => {
  const ext = getExtension(item.fileName);

  if (ext === "txt") {
    return fetchTextContent(item);
  }

  if (["doc", "docx"].includes(ext)) {
    const preview = await fetchDocPreview(item);
    return preview.text || "";
  }

  if (["xls", "xlsx"].includes(ext)) {
    const preview = await fetchExcelPreview(item);
    return preview.sheets
      .flatMap((sheet) => sheet.rows)
      .flat()
      .filter(Boolean)
      .join("\n");
  }

  if (ext === "pdf") {
    throw ApiError.badRequest(
      "PDF syllabus analysis is not supported yet. Upload DOCX or TXT for now.",
    );
  }

  throw ApiError.badRequest(
    "This file type is not supported for syllabus analysis yet",
  );
};

export const analyzeDocumentText = (text, { title = "Document" } = {}) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  const topics = extractTopics(text);
  const examDate = extractExamDate(normalized);
  const difficulty = estimateDifficulty(normalized, topics.length);
  const hoursPerWeek = estimateHoursPerWeek(normalized, topics.length, difficulty);

  return {
    suggestedName: title,
    examDate,
    difficulty,
    hoursPerWeek,
    topics,
    rationale: buildRationale({
      difficulty,
      hoursPerWeek,
      topicCount: topics.length,
      examDate,
    }),
  };
};

export const analyzeContentDocument = async (userId, documentId) => {
  const item = await contentRepository.findByIdAndUserId(documentId, userId);

  if (!item) {
    throw ApiError.notFound("Document not found or you don't have permission");
  }

  if (item.type !== CONTENT_TYPE.FILE) {
    throw ApiError.badRequest("Only uploaded files can be analyzed for planning");
  }

  const text = await extractDocumentText(item);
  if (!text.trim()) {
    throw ApiError.badRequest("Could not extract readable text from this document");
  }

  let analysis;
  if (isAiPlanMockEnabled()) {
    analysis = analyzeDocumentText(text, { title: item.title });
  } else {
    try {
      const { analyzeDocumentWithGemini } = await import("./ai-plan.gemini.js");
      analysis = await analyzeDocumentWithGemini(text, { title: item.title });
    } catch (error) {
      console.error(
        "[ai-plan] Gemini analyze failed, using heuristic fallback:",
        error.message,
      );
      analysis = analyzeDocumentText(text, { title: item.title });
    }
  }
  let userSubject = null;

  if (item.subjectId) {
    const subject = await assertSubjectOwned(userId, item.subjectId);
    userSubject = serializeSubject(subject);
  }

  return {
    documentId: item.id,
    documentTitle: item.title,
    linkedSubjectId: item.subjectId ?? null,
    ...analysis,
    userSubject,
    analyzedAt: toDateOnly(new Date()),
  };
};
