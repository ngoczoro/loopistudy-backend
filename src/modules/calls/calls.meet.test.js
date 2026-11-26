import { describe, expect, it } from "@jest/globals";
import { normalizeMeetUrl } from "./calls.meet.js";

describe("normalizeMeetUrl", () => {
  it("accepts Google Meet links in common shapes", () => {
    expect(normalizeMeetUrl("https://meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
    expect(normalizeMeetUrl("meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
    expect(normalizeMeetUrl(" HTTPS://MEET.GOOGLE.COM/ABC-DEFG-HIJ?authuser=1 ")).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
    expect(normalizeMeetUrl("http://meet.google.com/abc-defg-hij#x")).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("rejects anything else", () => {
    for (const value of [
      "",
      null,
      undefined,
      "https://evil.com/abc-defg-hij",
      "https://meet.google.com.evil.com/abc-defg-hij",
      "https://evil.com/?u=https://meet.google.com/abc-defg-hij",
      "https://meet.google.com/new",
      "https://meet.google.com/abc-defg",
      "javascript:alert(1)//meet.google.com/abc-defg-hij",
    ]) {
      expect(normalizeMeetUrl(value)).toBeNull();
    }
  });
});
