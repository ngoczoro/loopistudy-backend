import { describe, expect, it } from "@jest/globals";
import { resolveMaxStudyHoursPerDay } from "./planner.schedulingPrefs.js";

describe("resolveMaxStudyHoursPerDay", () => {
  it("prefers explicit request value over saved preference", () => {
    expect(
      resolveMaxStudyHoursPerDay({ requestValue: 3, savedValue: 6 }),
    ).toBe(3);
  });

  it("uses saved preference when request omits value", () => {
    expect(
      resolveMaxStudyHoursPerDay({ requestValue: undefined, savedValue: 5 }),
    ).toBe(5);
  });

  it("falls back to default when neither is set", () => {
    expect(
      resolveMaxStudyHoursPerDay({ requestValue: undefined, savedValue: null }),
    ).toBe(4);
  });
});
