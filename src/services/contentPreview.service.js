import mammoth from "mammoth";
import * as XLSX from "xlsx";
import ApiError from "../utils/ApiError.js";
import { getExtension, isTextFile } from "../shared/utils/contentFileTypes.js";

const fetchFileBuffer = async (fileUrl) => {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw ApiError.notFound("Unable to load file from storage");
  }
  return Buffer.from(await response.arrayBuffer());
};

export const fetchTextContent = async (item) => {
  if (!item.fileUrl) {
    throw ApiError.notFound("File content not available");
  }

  const buffer = await fetchFileBuffer(item.fileUrl);
  return buffer.toString("utf-8");
};

export const fetchDocPreview = async (item) => {
  const ext = getExtension(item.fileName);

  if (!["doc", "docx"].includes(ext)) {
    throw ApiError.badRequest("Doc preview is only available for DOC/DOCX files");
  }

  if (ext === "doc") {
    throw ApiError.badRequest(
      "Legacy .doc format preview is not supported. Please download the file or upload a .docx version.",
    );
  }

  if (!item.fileUrl) {
    throw ApiError.notFound("File content not available");
  }

  const buffer = await fetchFileBuffer(item.fileUrl);
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const textResult = await mammoth.extractRawText({ buffer });

  return {
    html: htmlResult.value,
    text: textResult.value,
  };
};

export const fetchExcelPreview = async (item) => {
  const ext = getExtension(item.fileName);

  if (!["xls", "xlsx"].includes(ext)) {
    throw ApiError.badRequest("Excel preview is only available for XLS/XLSX files");
  }

  if (!item.fileUrl) {
    throw ApiError.notFound("File content not available");
  }

  const buffer = await fetchFileBuffer(item.fileUrl);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      defval: "",
    }),
  }));

  return { sheets };
};

export const assertTextFileItem = (item) => {
  if (!isTextFile(item)) {
    throw ApiError.badRequest("Text preview is only available for TXT files");
  }
};
