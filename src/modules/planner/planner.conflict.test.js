import { describe, expect, it } from "@jest/globals";
import {
  assertSessionNoOverlap,
  sessionOverlapsBlockedSlot,
} from "./planner.conflict.js";

describe("planner.conflict", () => {
  it("detects blocked slot overlap", () => {
    const blocked = sessionOverlapsBlockedSlot(0, 9, 1.5, [{ day: "Mon", hour: 9 }]);
    expect(blocked).toBe(true);
  });

  it("detects session overlap", () => {
    expect(() =>
      assertSessionNoOverlap(0, 10, 2, [
        {
          dayOfWeek: 0,
          startHour: 11,
          durationHours: 1,
        },
      ]),
    ).toThrow("This time slot already has a study session");
  });
});
