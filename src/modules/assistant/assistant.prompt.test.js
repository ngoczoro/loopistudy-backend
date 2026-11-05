import { describe, expect, it } from "@jest/globals";
import {
  buildRagUserPrompt,
  looksLikeNotFoundRefusal,
  sanitizeCitationMarkers,
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
    expect(sanitizeCitationMarkers("A [1] leaked [9] and [0].", 2)).toBe(
      "A [1] leaked and .",
    );
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
