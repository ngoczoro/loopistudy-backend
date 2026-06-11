import { describe, expect, it } from "@jest/globals";
import { analyzeDocumentText } from "./ai-plan.analyze.js";

describe("analyzeDocumentText", () => {
  it("extracts exam date and topics from syllabus-like text", () => {
    const text = `
      Course syllabus
      Exam date: 15/12/2026
      Chapter 1: Introduction
      Chapter 2: Data Structures
      Chapter 3: Algorithms
      Chapter 4: Advanced proofs
      Chapter 5: Final review
    `;

    const result = analyzeDocumentText(text, { title: "CS101" });

    expect(result.examDate).toBe("2026-12-15");
    expect(result.topics.length).toBeGreaterThan(0);
    expect(result.hoursPerWeek).toBeGreaterThanOrEqual(3);
    expect(["Easy", "Medium", "Hard"]).toContain(result.difficulty);
  });
});
