export const SUMMARY_PROMPT_VERSION = "1.0.0";

/**
 * Build Vietnamese summary prompt for OpenAI Responses API.
 */
export const buildSummaryPrompt = ({
  documentTitle = "",
  subjectName = "",
  documentText = "",
} = {}) => {
  const instructions = `Bạn là trợ lý học tập thông minh cho sinh viên Việt Nam.
Nhiệm vụ: đọc nội dung tài liệu học tập và tạo bản tóm tắt có cấu trúc.

Yêu cầu bắt buộc:
- Trả về ONLY valid JSON, không markdown, không giải thích thêm.
- Ngôn ngữ: Tiếng Việt.
- Giọng văn: ngắn gọn, thân thiện, dễ hiểu với sinh viên.
- summary: đoạn tóm tắt vừa phải (khoảng 120-220 từ), không quá dài.
- keyPoints: 5-8 ý chính, mỗi ý là một câu ngắn.
- learningNotes: 3-5 ghi chú học tập thực tế (mẹo, lưu ý, cách ôn).
- keywords: 5-10 từ khóa quan trọng.

JSON shape:
{
  "summary": "string",
  "keyPoints": ["string"],
  "learningNotes": ["string"],
  "keywords": ["string"]
}`;

  const contextLines = [
    documentTitle ? `Tiêu đề tài liệu: ${documentTitle}` : null,
    subjectName ? `Môn học: ${subjectName}` : null,
  ].filter(Boolean);

  const input = `${contextLines.join("\n")}${contextLines.length ? "\n\n" : ""}Nội dung tài liệu:\n${documentText}`;

  return {
    feature: "summary",
    version: SUMMARY_PROMPT_VERSION,
    instructions,
    input,
  };
};
