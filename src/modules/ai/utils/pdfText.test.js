import { describe, expect, it } from "@jest/globals";
import { joinWrappedPdfLines } from "./pdfText.js";

describe("joinWrappedPdfLines", () => {
  it("rejoins a sentence that wraps onto the next printed line", () => {
    const text = [
      "Kế thừa (Inheritance) cho phép một lớp con dùng lại các thuộc tính và",
      "phương thức của lớp cha.",
    ].join("\n");
    expect(joinWrappedPdfLines(text)).toBe(
      "Kế thừa (Inheritance) cho phép một lớp con dùng lại các thuộc tính và phương thức của lớp cha.",
    );
  });

  it("keeps a sentence that ended, and a new one starting with a capital", () => {
    const text = "Đóng gói che giấu dữ liệu bên trong đối tượng một cách an toàn.\nĐa hình cho phép nhiều cách hoạt động.";
    expect(joinWrappedPdfLines(text)).toBe(text);
  });

  it("keeps headings and short list items on their own lines", () => {
    const text = "Ưu điểm\nrẻ\nnhanh\ndễ mở rộng";
    expect(joinWrappedPdfLines(text)).toBe(text);
  });

  it("does not merge a bullet into the line above", () => {
    const text = "Cloud computing có các nhược điểm chính sau đây cần lưu ý khi dùng\n- phụ thuộc kết nối mạng";
    expect(joinWrappedPdfLines(text)).toBe(text);
  });

  it("does not join across a blank line (paragraph or page break)", () => {
    const text = "Một đoạn văn khá dài kết thúc ở cuối trang mà không có dấu chấm\n\ntiếp theo ở trang sau";
    expect(joinWrappedPdfLines(text)).toBe(text);
  });

  it("keeps the hyphen of a word split at the line end", () => {
    const text = "Một rủi ro lớn khi dùng dịch vụ đám mây là hiện tượng vendor lock-\nin với nhà cung cấp.";
    expect(joinWrappedPdfLines(text)).toBe(
      "Một rủi ro lớn khi dùng dịch vụ đám mây là hiện tượng vendor lock-in với nhà cung cấp.",
    );
  });
});
