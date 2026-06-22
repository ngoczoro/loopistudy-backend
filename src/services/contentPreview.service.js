import mammoth from "mammoth";
import * as XLSX from "xlsx";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import ApiError from "../utils/ApiError.js";
import { getExtension, isTextFile } from "../shared/utils/contentFileTypes.js";

// const fetchFileBuffer = async (fileUrl) => {
//   const response = await fetch(fileUrl);
//   if (!response.ok) {
//     throw ApiError.notFound("Unable to load file from storage");
//   }
//   return Buffer.from(await response.arrayBuffer());
// };

const fetchFileBuffer = async (fileUrl) => {
  try {
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      // In lỗi ra console để dev dễ theo dõi khi chạy local/staging
      console.error(`[fetchFileBuffer] Tải file thất bại. Status: ${response.status} ${response.statusText} | URL: ${fileUrl}`);
      
      // Trả về mã lỗi chi tiết hơn cho client hoặc tầng sau
      throw ApiError.notFound(`Unable to load file from storage (HTTP ${response.status})`);
    }
    
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    // Trường hợp lỗi kết nối mạng, DNS không phân giải được, v.v.
    if (error instanceof ApiError) throw error;
    
    console.error(`[fetchFileBuffer] Lỗi kết nối mạng:`, error.message);
    throw ApiError.internal(`Network error while fetching file: ${error.message}`);
  }
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

// Bước 2: Định nghĩa và Export Named Function xử lý PDF
export const fetchPdfPreview = async (item) => {
  const ext = getExtension(item.fileName);

  if (ext !== "pdf") {
    throw ApiError.badRequest("PDF preview is only available for PDF files");
  }

  if (!item.fileUrl) {
    throw ApiError.notFound("File content not available");
  }

  try {
    // Tải file buffer về tương tự các hàm xử lý docx/xlsx bên trên
    const buffer = await fetchFileBuffer(item.fileUrl);
    
    // Parse text từ buffer sử dụng gói thư viện pdf-parse
    const data = await pdfParse(buffer);

    return {
      text: data.text || "",
      numpages: data.numpages, // Bạn có thể giữ thông tin số trang nếu sau này cần dùng tới
    };
  } catch (error) {
    // Catch lỗi phân tách file lỗi hoặc buffer trống
    throw ApiError.badRequest(`Failed to parse PDF document: ${error.message}`);
  }
};

export const assertTextFileItem = (item) => {
  if (!isTextFile(item)) {
    throw ApiError.badRequest("Text preview is only available for TXT files");
  }
};