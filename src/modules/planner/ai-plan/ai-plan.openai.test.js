import { describe, expect, it } from "@jest/globals";
import {
  validateAnalyzeResult,
  validateChatResult,
} from "./ai-plan.openai.js";

describe("validateChatResult", () => {
  it("filters unknown intent types", () => {
    const result = validateChatResult({
      reply: "Done",
      needsClarification: false,
      intents: [
        { type: "SET_HOURS_PER_WEEK", subjectName: "Bio", value: 2 },
        { type: "PLACE_SESSION_AT", hour: 9 },
      ],
    });

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0].type).toBe("SET_HOURS_PER_WEEK");
  });

  it("preserves clarification responses", () => {
    const result = validateChatResult({
      reply: "Which subject?",
      needsClarification: true,
      clarificationQuestion: "Which subject should I change?",
      intents: [],
    });

    expect(result.needsClarification).toBe(true);
    expect(result.clarificationQuestion).toContain("Which subject");
  });
});

describe("validateAnalyzeResult", () => {
  it("normalizes syllabus analysis fields", () => {
    const result = validateAnalyzeResult(
      {
        suggestedName: "Linear Algebra",
        examDate: "2026-12-15",
        difficulty: "Hard",
        hoursPerWeek: 6,
        topics: ["Chapter 1", "Chapter 2"],
        rationale: "Heavy workload",
      },
      "Doc",
    );

    expect(result.suggestedName).toBe("Linear Algebra");
    expect(result.examDate).toBe("2026-12-15");
    expect(result.difficulty).toBe("Hard");
    expect(result.hoursPerWeek).toBe(6);
    expect(result.topics).toHaveLength(2);
  });
});
