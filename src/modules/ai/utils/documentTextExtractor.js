import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { CONTENT_TYPE } from "../../../config/constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  fetchDocPreview,
  fetchTextContent,
} from "../../../services/contentPreview.service.js";
import { getExtension, isImageFile } from "../../../shared/utils/contentFileTypes.js";
import { truncateInput } from "./inputGuard.js";
import { MAX_AI_INPUT_CHARS } from "../ai.constants.js";
import { extractTextFromPptxBuffer } from "./pptxTextExtractor.js";

const UNSUPPORTED_MESSAGE =
  "This file type is not supported for AI summary yet.";

const EMPTY_TEXT_MESSAGE =
  "No extractable text was found in this document.";

const fetchFileBuffer = async (fileUrl) => {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw ApiError.notFound("Unable to load file from storage");
  }
  return Buffer.from(await response.arrayBuffer());
};

const extractPdfText = async (item) => {
  if (!item.fileUrl) {
    throw ApiError.notFound("File content not available");
  }

  const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
  const buffer = await fetchFileBuffer(item.fileUrl);
  const result = await pdfParse(buffer);
  return result.text ?? "";
};

const extractExcelText = async (item) => {
  if (!item.fileUrl) {
    throw ApiError.notFound("File content not available");
  }

  const buffer = await fetchFileBuffer(item.fileUrl);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
    });

    const sheetText = rows
      .map((row) => row.filter(Boolean).join(" "))
      .filter(Boolean)
      .join("\n");

    if (sheetText) {
      parts.push(`[${sheetName}]\n${sheetText}`);
    }
  }

  return parts.join("\n\n");
};

const extractPptxText = async (item) => {
  if (!item.fileUrl) {
    throw ApiError.notFound("File content not available");
  }

  try {
    const buffer = await fetchFileBuffer(item.fileUrl);
    return extractTextFromPptxBuffer(buffer);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest("Unable to read this presentation file.");
  }
};

const normalizeExtractedText = (text) =>
  String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractFileText = async (item) => {
  const ext = getExtension(item.fileName);

  if (isImageFile(item)) {
    throw ApiError.badRequest(UNSUPPORTED_MESSAGE);
  }

  if (ext === "txt") {
    return fetchTextContent(item);
  }

  if (ext === "pdf") {
    return extractPdfText(item);
  }

  if (ext === "docx") {
    const preview = await fetchDocPreview(item);
    return preview.text ?? "";
  }

  if (ext === "ppt") {
    throw ApiError.badRequest(UNSUPPORTED_MESSAGE);
  }

  if (ext === "pptx") {
    return extractPptxText(item);
  }

  if (["xls", "xlsx"].includes(ext)) {
    return extractExcelText(item);
  }

  throw ApiError.badRequest(UNSUPPORTED_MESSAGE);
};

const buildNoteText = (item) => {
  const parts = [];

  if (item.title?.trim()) parts.push(item.title.trim());
  if (item.description?.trim()) parts.push(item.description.trim());
  if (item.content?.trim()) parts.push(item.content.trim());

  return parts.join("\n\n");
};

/**
 * Extract plain text from a content item for AI summarization.
 * @param {object} item - Serialized content item or Sequelize model plain fields
 */
export const extractDocumentText = async (item) => {
  if (!item) {
    throw ApiError.notFound("Content not found");
  }

  let text = "";

  if (item.type === CONTENT_TYPE.NOTE) {
    text = buildNoteText(item);
  } else if (item.type === CONTENT_TYPE.FILE) {
    text = await extractFileText(item);
  } else {
    throw ApiError.badRequest(UNSUPPORTED_MESSAGE);
  }

  text = normalizeExtractedText(text);

  if (!text) {
    throw ApiError.badRequest(EMPTY_TEXT_MESSAGE);
  }

  return truncateInput(text, MAX_AI_INPUT_CHARS);
};
