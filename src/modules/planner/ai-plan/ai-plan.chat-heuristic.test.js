import { parseChatHeuristic } from "./ai-plan.chat-heuristic.js";

const subjects = [
  { id: "1", name: "Physics", difficulty: "Hard", priority: "medium" },
  { id: "2", name: "Calculus", difficulty: "Medium", priority: "low" },
];

describe("parseChatHeuristic", () => {
  it("parses hours and no-study-after constraints", () => {
    const result = parseChatHeuristic(
      "Giảm Physics xuống 2 giờ mỗi tuần và không học sau 20h",
      { subjects },
    );

    expect(result.needsClarification).toBe(false);
    expect(result.intents).toEqual(
      expect.arrayContaining([
        { type: "NO_STUDY_AFTER", hour: 20 },
        { type: "SET_HOURS_PER_WEEK", subjectName: "Physics", value: 2 },
      ]),
    );
  });

  it("asks for clarification when message is too vague", () => {
    const result = parseChatHeuristic("help me please", { subjects });
    expect(result.needsClarification).toBe(true);
    expect(result.intents).toEqual([]);
  });
});
