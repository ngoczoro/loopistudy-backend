import { describe, expect, it } from "@jest/globals";
import {
  splitBySectionHeaders,
  splitForRag,
  splitIntoChunks,
  splitPdfByPages,
} from "./assistant.chunker.js";

describe("splitIntoChunks", () => {
  it("returns empty for blank input", () => {
    expect(splitIntoChunks("")).toEqual([]);
    expect(splitIntoChunks("   ")).toEqual([]);
  });

  it("keeps a short note as one chunk", () => {
    const chunks = splitIntoChunks("Encapsulation dong goi du lieu trong Java.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].location).toBe("Đoạn 1");
    expect(chunks[0].chunkText).toContain("Encapsulation");
  });

  it("splits long text into overlapping chunks with rising indexes", () => {
    const paragraph = "Sentence about OOP. ".repeat(200);
    const chunks = splitIntoChunks(paragraph);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.chunkIndex)).toEqual(
      Array.from({ length: chunks.length }, (_, i) => i),
    );
    expect(chunks.every((c) => c.chunkText.length > 0)).toBe(true);
  });
});

describe("splitForRag sections", () => {
  it("keeps Technical Skills separate from Experience", () => {
    const text = `Dao Le Bao Ngoc
Software Engineer
Experience
Built XPath locators for Mesha automation of MSA/SOW/PO.
Technical Skills
Languages: JavaScript, TypeScript, Java, SQL
Tools: Git, Docker, Jira
Projects
LoopiStudy app with React and Node.js.`;

    const sections = splitBySectionHeaders(text);
    expect(sections).not.toBeNull();
    const skills = sections.find((s) => s.header === "Technical Skills");
    expect(skills).toBeTruthy();
    expect(skills.text).toContain("JavaScript");
    expect(skills.text).not.toContain("XPath");

    const chunks = splitForRag(text);
    const skillsChunk = chunks.find((c) => c.chunkText.includes("Technical Skills"));
    expect(skillsChunk.chunkText).toContain("TypeScript");
    expect(skillsChunk.chunkText).not.toContain("XPath");
  });
});

describe("splitPdfByPages", () => {
  it("returns null when there is no form-feed page break", () => {
    expect(splitPdfByPages("one page only")).toBeNull();
  });

  it("labels chunks by page when form feeds exist", () => {
    const text = `Page one content about TCP.\fPage two content about UDP protocol.`;
    const chunks = splitPdfByPages(text);
    expect(chunks).not.toBeNull();
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].location).toMatch(/^Trang 1/);
    expect(chunks.some((c) => /^Trang 2/.test(c.location))).toBe(true);
  });
});
