import { describe, expect, it } from "@jest/globals";
import {
  buildOllamaUserPrompt,
  buildRagUserPrompt,
  looksLikeNotFoundRefusal,
  sanitizeCitationMarkers,
  stripAnswerPrefix,
  visibleAnswerText,
} from "./assistant.prompt.js";

describe("looksLikeNotFoundRefusal", () => {
  it("detects the canned not-found phrasing", () => {
    expect(
      looksLikeNotFoundRefusal(
        "Mình không tìm thấy nội dung này trong tài liệu bạn đã chọn. Hãy thử hỏi cách khác.",
      ),
    ).toBe(true);
  });

  it("allows a normal grounded answer", () => {
    expect(
      looksLikeNotFoundRefusal(
        "Binary tree là cây mà mỗi nút có tối đa hai con [1].",
      ),
    ).toBe(false);
  });
});

describe("sanitizeCitationMarkers", () => {
  it("keeps markers within the citation range", () => {
    expect(sanitizeCitationMarkers("A [1] and B [2].", 2)).toBe("A [1] and B [2].");
  });

  it("strips markers outside the citation range", () => {
    expect(sanitizeCitationMarkers("A [1] leaked [9] and [0].", 2)).toBe("A [1] leaked and.");
  });

  it("leaves no space before punctuation where a marker was removed", () => {
    expect(sanitizeCitationMarkers("Vendor lock-in, Security [5].", 1)).toBe("Vendor lock-in, Security.");
  });

  it("strips role-label fake citations like [Học viên]", () => {
    expect(
      sanitizeCitationMarkers("Binary tree là gì [Học viên] -> [1] đúng.", 1),
    ).toBe("Binary tree là gì -> [1] đúng.");
  });

  it("handles empty text", () => {
    expect(sanitizeCitationMarkers("", 3)).toBe("");
    expect(sanitizeCitationMarkers(null, 3)).toBe("");
  });
});

describe("buildRagUserPrompt", () => {
  it("includes passages and question without chat history", () => {
    const prompt = buildRagUserPrompt({
      question: "SOLID la gi?",
      hits: [
        {
          index: 1,
          documentTitle: "OOP",
          location: "Đoạn 1",
          excerpt: "Single Responsibility...",
        },
      ],
    });
    expect(prompt).toContain("SOLID la gi?");
    expect(prompt).toContain("[1] OOP");
    expect(prompt).toContain("Single Responsibility");
    expect(prompt).not.toContain("Recent chat");
    expect(prompt).not.toContain("Học viên");
  });
});

describe("answer checks for small models", () => {
  it("does not treat an empty or marker-only reply as a refusal", () => {
    expect(looksLikeNotFoundRefusal("")).toBe(false);
    expect(looksLikeNotFoundRefusal("[5]")).toBe(false);
  });

  it("detects short Vietnamese refusals", () => {
    expect(looksLikeNotFoundRefusal("Không có trong tài liệu.")).toBe(true);
    expect(
      looksLikeNotFoundRefusal("Chưa có thông tin rõ ràng về lợi ích từ các đoạn tài liệu."),
    ).toBe(true);
  });

  it("keeps a long answer that mentions a missing detail", () => {
    const answer =
      "Cloud computing có 4 nhược điểm: phụ thuộc kết nối Internet (Internet Connectivity), " +
      "bị khóa vào nhà cung cấp (Vendor lock-in), hạn chế quyền kiểm soát (Limited Control) và " +
      "vấn đề bảo mật (Security) [1]. Tài liệu không đề cập chi tiết cách khắc phục.";
    expect(looksLikeNotFoundRefusal(answer)).toBe(false);
  });

  it("measures the text a reader sees", () => {
    expect(visibleAnswerText("[5]")).toBe("");
    expect(visibleAnswerText("IaaS, PaaS, SaaS [1]")).toBe("IaaS, PaaS, SaaS");
  });

  it("strips the 'Trả lời:' prefix copied from the example", () => {
    expect(stripAnswerPrefix("Trả lời: IaaS, PaaS, SaaS [1]")).toBe("IaaS, PaaS, SaaS [1]");
  });

  it("builds the Ollama prompt with the example and the passages", () => {
    const prompt = buildOllamaUserPrompt({
      question: "nhược điểm?",
      hits: [{ index: 1, documentTitle: "Cloud", location: "Đoạn 1", excerpt: "Slide 5: Disadvantages" }],
    });
    expect(prompt).toContain("Ví dụ:");
    expect(prompt).toContain("[1] Cloud");
    expect(prompt.trim().endsWith("Trả lời:")).toBe(true);
  });
});
