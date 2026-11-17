import { describe, expect, it } from "@jest/globals";
import { docxHtmlToText } from "./docxHtmlToText.js";
import { parseListGroups } from "../../study-material/list-items.js";

describe("docxHtmlToText", () => {
  it("keeps a heading and its bullet list together", () => {
    const html =
      "<h2>Ưu điểm</h2><ul><li>Rẻ</li><li>Nhanh</li><li>Dễ mở rộng</li></ul>" +
      "<p>Điện toán đám mây giúp doanh nghiệp giảm chi phí hạ tầng.</p>";
    expect(docxHtmlToText(html)).toBe(
      "Ưu điểm\n\n- Rẻ\n- Nhanh\n- Dễ mở rộng\n\nĐiện toán đám mây giúp doanh nghiệp giảm chi phí hạ tầng.",
    );
  });

  it("keeps list items that Word wrapped in paragraphs on one line each", () => {
    const html = "<p><strong>Nhược điểm:</strong></p><ul><li><p>Phụ thuộc mạng</p></li><li><p>Bảo mật</p></li><li><p>Khó kiểm soát</p></li></ul>";
    expect(docxHtmlToText(html)).toBe("Nhược điểm:\n\n- Phụ thuộc mạng\n- Bảo mật\n- Khó kiểm soát");
  });

  it("decodes entities and turns table rows into cell lines", () => {
    const html = "<p>A &amp; B&nbsp;&lt;3</p><table><tr><td>IaaS</td><td>Hạ tầng</td></tr></table>";
    expect(docxHtmlToText(html)).toBe("A & B <3\n\nIaaS | Hạ tầng");
  });

  it("gives list groups the quiz can use", () => {
    const html =
      "<h2>Ưu điểm</h2><ul><li>Rẻ</li><li>Nhanh</li><li>Dễ mở rộng</li></ul>" +
      "<h2>Nhược điểm</h2><ul><li>Phụ thuộc mạng</li><li>Bảo mật</li><li>Khó kiểm soát</li></ul>";
    expect(parseListGroups(docxHtmlToText(html)).map((group) => group.label)).toEqual([
      "Ưu điểm",
      "Nhược điểm",
    ]);
  });
});
