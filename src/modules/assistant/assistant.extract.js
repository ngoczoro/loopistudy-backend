import crypto from "crypto";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { CONTENT_TYPE } from "../../config/constants.js";
import ApiError from "../../utils/ApiError.js";
import { fetchTextContent } from "../../services/contentPreview.service.js";
import { getExtension, isImageFile } from "../../shared/utils/contentFileTypes.js";
import { extractTextFromPptxBuffer } from "../ai/utils/pptxTextExtractor.js";
import { RAG_MAX_EXTRACT_CHARS } from "./assistant.constants.js";

export class UnsupportedDocumentError extends Error {
  constructor(message = "Unsupported document for RAG") {
    super(message);
    this.name = "UnsupportedDocumentError";
  }
}

const fetchFileBuffer = async (fileUrl) => {
  const response = await fetch(fileUrl);
  if (!response.ok) throw ApiError.notFound("Unable to load file from storage");
  return Buffer.from(await response.arrayBuffer());
};

const stripHtml = (value) =>
  String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

const normalizeText = (text) =>
  String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Fold Vietnamese accents for keyword / tsvector matching. */
export const foldVietnamese = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export const hashContent = (text) =>
  crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");

const extractPdf = async (item) => {
  const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
  const buffer = await fetchFileBuffer(item.fileUrl);
  const result = await pdfParse(buffer);
  const text = result.text ?? "";
  // Keep form-feeds if present so the chunker can label pages.
  return { text, kind: "pdf", pageCount: result.numpages ?? null };
};

const extractDocx = async (item) => {
  const buffer = await fetchFileBuffer(item.fileUrl);
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value ?? "", kind: "docx" };
};

const extractExcel = async (item) => {
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
    if (sheetText) parts.push(`[${sheetName}]\n${sheetText}`);
  }
  return { text: parts.join("\n\n"), kind: "excel" };
};

const extractFile = async (item) => {
  if (!item.fileUrl) throw new UnsupportedDocumentError("File has no URL");
  if (isImageFile(item)) throw new UnsupportedDocumentError("Images are not indexed");

  const ext = getExtension(item.fileName);
  if (ext === "txt") return { text: await fetchTextContent(item), kind: "txt" };
  if (ext === "pdf") return extractPdf(item);
  if (ext === "docx") return extractDocx(item);
  if (ext === "pptx") {
    const buffer = await fetchFileBuffer(item.fileUrl);
    return { text: extractTextFromPptxBuffer(buffer), kind: "pptx" };
  }
  if (["xls", "xlsx"].includes(ext)) return extractExcel(item);
  if (["ppt", "doc"].includes(ext)) {
    throw new UnsupportedDocumentError(`Extension .${ext} is not supported`);
  }
  throw new UnsupportedDocumentError(`Extension .${ext || "unknown"} is not supported`);
};

/**
 * Extract full plain text for RAG indexing (no 32k summary truncate).
 * @returns {{ text: string, kind: string, contentHash: string, pageCount?: number|null }}
 */
export const extractForRag = async (item) => {
  if (!item) throw ApiError.notFound("Content not found");

  let extracted;
  if (item.type === CONTENT_TYPE.NOTE) {
    const parts = [item.title, item.description, stripHtml(item.content)].filter(Boolean);
    extracted = { text: parts.join("\n\n"), kind: "note" };
  } else if (item.type === CONTENT_TYPE.FILE) {
    extracted = await extractFile(item);
  } else {
    throw new UnsupportedDocumentError("Links are not indexed");
  }

  let text = normalizeText(extracted.text);
  if (!text) throw new UnsupportedDocumentError("No extractable text");

  if (text.length > RAG_MAX_EXTRACT_CHARS) {
    text = text.slice(0, RAG_MAX_EXTRACT_CHARS);
  }

  return {
    text,
    kind: extracted.kind,
    pageCount: extracted.pageCount ?? null,
    contentHash: hashContent(text),
  };
};
