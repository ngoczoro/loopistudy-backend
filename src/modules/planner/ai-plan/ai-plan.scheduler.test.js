import { describe, expect, it } from "@jest/globals";
import {
  buildReplacePreview,
  getMaxSubjectsPerDay,
  groupSessionsByWeek,
  runScheduler,
} from "./ai-plan.scheduler.js";

const baseSubject = {
  id: "sub-1",
  name: "Calculus",
  difficulty: "Hard",
  priority: "high",
  examDate: "2026-12-01",
  requiredHoursPerWeek: 4,
  color: "340 82% 59%",
};

const makeSubject = (id, name, hours = 3) => ({
  id,
  name,
  difficulty: "Medium",
  priority: "medium",
  examDate: "2026-12-01",
  requiredHoursPerWeek: hours,
  color: null,
});

describe("getMaxSubjectsPerDay", () => {
  it("returns tiered caps by subject count", () => {
    expect(getMaxSubjectsPerDay(2)).toBe(1);
    expect(getMaxSubjectsPerDay(3)).toBe(1);
    expect(getMaxSubjectsPerDay(4)).toBe(3);
    expect(getMaxSubjectsPerDay(6)).toBe(3);
    expect(getMaxSubjectsPerDay(7)).toBe(4);
    expect(getMaxSubjectsPerDay(10)).toBe(4);
    expect(getMaxSubjectsPerDay(11)).toBe(5);
  });
});

describe("runScheduler", () => {
  it("places sessions without overlapping blocked slots", () => {
    const { sessions, warnings } = runScheduler({
      subjects: [baseSubject],
      planStart: "2026-06-08",
      blockedSlots: [{ day: "Mon", hour: 8 }, { day: "Mon", hour: 9 }],
      existingSessions: [],
      scopeSubjectIds: ["sub-1"],
      constraints: [],
    });

    expect(warnings).toEqual([]);
    expect(sessions.length).toBeGreaterThan(0);
    for (const session of sessions) {
      if (session.dayOfWeek === 0) {
        expect(session.startHour).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it("avoids manual sessions when placing new ones", () => {
    const { sessions } = runScheduler({
      subjects: [baseSubject],
      planStart: "2026-06-08",
      blockedSlots: [],
      existingSessions: [
        {
          weekStartDate: "2026-06-08",
          dayOfWeek: 0,
          startHour: 10,
          durationHours: 2,
          source: "manual",
          subjectId: null,
        },
      ],
      scopeSubjectIds: ["sub-1"],
      constraints: [],
    });

    const weekOneMonday = sessions.filter(
      (s) => s.weekStartDate === "2026-06-08" && s.dayOfWeek === 0,
    );

    for (const session of weekOneMonday) {
      const overlaps =
        session.startHour < 12 && session.startHour + session.durationHours > 10;
      expect(overlaps).toBe(false);
    }
  });

  it("schedules multiple weeks until exam buffer", () => {
    const { sessions } = runScheduler({
      subjects: [baseSubject],
      planStart: "2026-06-08",
      blockedSlots: [],
      existingSessions: [],
      scopeSubjectIds: ["sub-1"],
      constraints: [],
    });

    const weeks = new Set(sessions.map((s) => s.weekStartDate));
    expect(weeks.size).toBeGreaterThan(1);
  });

  it("allows only one session per subject per day", () => {
    const { sessions } = runScheduler({
      subjects: [makeSubject("sub-1", "Physics", 6)],
      planStart: "2026-06-08",
      blockedSlots: [],
      existingSessions: [],
      scopeSubjectIds: ["sub-1"],
      constraints: [],
    });

    const weekOne = sessions.filter((s) => s.weekStartDate === "2026-06-08");
    const byDay = new Map();
    for (const session of weekOne) {
      const key = session.dayOfWeek;
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    for (const count of byDay.values()) {
      expect(count).toBe(1);
    }
  });

  it("spreads three subjects across different days in a week", () => {
    const subjects = [
      makeSubject("sub-1", "OOP", 3),
      makeSubject("sub-2", "DA1", 3),
      makeSubject("sub-3", "English", 3),
    ];

    const { sessions } = runScheduler({
      subjects,
      planStart: "2026-06-08",
      blockedSlots: [],
      existingSessions: [],
      scopeSubjectIds: subjects.map((s) => s.id),
      constraints: [],
    });

    const weekOne = sessions.filter((s) => s.weekStartDate === "2026-06-08");
    const subjectsPerDay = new Map();

    for (const session of weekOne) {
      const set = subjectsPerDay.get(session.dayOfWeek) ?? new Set();
      set.add(session.subjectId);
      subjectsPerDay.set(session.dayOfWeek, set);
    }

    for (const subjectSet of subjectsPerDay.values()) {
      expect(subjectSet.size).toBeLessThanOrEqual(1);
    }

    expect(subjectsPerDay.size).toBeGreaterThanOrEqual(3);
  });

  it("respects user weekly hours when splitting sessions", () => {
    const { sessions } = runScheduler({
      subjects: [makeSubject("sub-1", "Physics", 9)],
      planStart: "2026-06-08",
      blockedSlots: [],
      existingSessions: [],
      scopeSubjectIds: ["sub-1"],
      constraints: [],
    });

    const weekOneHours = sessions
      .filter((s) => s.weekStartDate === "2026-06-08")
      .reduce((sum, s) => sum + s.durationHours, 0);

    expect(weekOneHours).toBe(9);
  });
});

describe("groupSessionsByWeek", () => {
  it("groups and labels weeks", () => {
    const weeks = groupSessionsByWeek([
      {
        subjectId: "sub-1",
        title: "Calculus — Review",
        dayOfWeek: 0,
        startHour: 10,
        durationHours: 2,
        weekStartDate: "2026-06-08",
        color: null,
        source: "ai_plan",
      },
    ]);

    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekStartDate).toBe("2026-06-08");
    expect(weeks[0].label).toMatch(/Jun/);
    expect(weeks[0].totalHours).toBe(2);
  });
});

describe("buildReplacePreview", () => {
  it("counts only scoped ai_plan sessions", () => {
    const preview = buildReplacePreview(
      [
        {
          source: "ai_plan",
          subjectId: "sub-1",
          dayOfWeek: 0,
          startHour: 9,
          durationHours: 1,
          weekStartDate: "2026-06-08",
        },
        {
          source: "manual",
          subjectId: "sub-1",
          dayOfWeek: 1,
          startHour: 9,
          durationHours: 1,
          weekStartDate: "2026-06-08",
        },
      ],
      ["sub-1"],
      [{ id: "sub-1", name: "Calculus" }],
    );

    expect(preview[0].countToReplace).toBe(1);
  });
});
