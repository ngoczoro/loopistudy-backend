import { SUBJECT_DIFFICULTY } from "../../../config/constants.js";
import { applyChatIntents } from "./ai-plan.intent.js";

const baseSubjects = [
  {
    id: "sub-1",
    name: "Calculus",
    difficulty: SUBJECT_DIFFICULTY.HARD,
    priority: "medium",
    requiredHoursPerWeek: 6,
  },
  {
    id: "sub-2",
    name: "Physics",
    difficulty: SUBJECT_DIFFICULTY.MEDIUM,
    priority: "low",
    requiredHoursPerWeek: 4,
  },
];

describe("applyChatIntents", () => {
  it("applies hours, priority, difficulty, and constraints", () => {
    const result = applyChatIntents({
      subjects: baseSubjects,
      schedulingOverrides: [],
      constraints: [],
      intents: [
        { type: "SET_HOURS_PER_WEEK", subjectName: "Physics", value: 2 },
        { type: "SET_PRIORITY", subjectName: "Calculus", priority: "high" },
        { type: "REDUCE_DIFFICULTY", subjectName: "Calculus" },
        { type: "NO_STUDY_AFTER", hour: 20 },
        {
          type: "BLOCK_DAY",
          dayOfWeek: 5,
          weekStartDate: "2026-06-01",
        },
        {
          type: "MOVE_SUBJECT_TO_DAY",
          subjectName: "Physics",
          dayOfWeek: 2,
        },
      ],
    });

    expect(result.schedulingOverrides).toEqual([
      { subjectId: "sub-2", hoursPerWeek: 2 },
      { subjectId: "sub-1", difficulty: SUBJECT_DIFFICULTY.MEDIUM },
    ]);

    expect(result.subjects[0].priority).toBe("high");
    expect(result.subjects[0].difficulty).toBe(SUBJECT_DIFFICULTY.MEDIUM);

    expect(result.constraints).toEqual([
      { type: "NO_STUDY_AFTER", hour: 20 },
      { type: "BLOCK_DAY", dayOfWeek: 5, weekStartDate: "2026-06-01" },
      { type: "MOVE_SUBJECT_TO_DAY", subjectId: "sub-2", dayOfWeek: 2 },
    ]);
  });
});
