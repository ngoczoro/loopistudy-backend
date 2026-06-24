import { describe, expect, it } from "@jest/globals";
import {
  isAiPlanLlmEnabled,
  isAiPlanMockEnabled,
} from "./ai-plan.constants.js";

describe("isAiPlanMockEnabled", () => {
  const original = process.env.STUDY_PLAN_AI_MOCK;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.STUDY_PLAN_AI_MOCK;
    } else {
      process.env.STUDY_PLAN_AI_MOCK = original;
    }
  });

  it("is false by default (unset env)", () => {
    delete process.env.STUDY_PLAN_AI_MOCK;
    expect(isAiPlanMockEnabled()).toBe(false);
  });

  it("is true only when explicitly set to true", () => {
    process.env.STUDY_PLAN_AI_MOCK = "true";
    expect(isAiPlanMockEnabled()).toBe(true);
  });

  it("is false when set to false", () => {
    process.env.STUDY_PLAN_AI_MOCK = "false";
    expect(isAiPlanMockEnabled()).toBe(false);
  });
});

describe("isAiPlanLlmEnabled", () => {
  const originalMock = process.env.STUDY_PLAN_AI_MOCK;
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalMock === undefined) {
      delete process.env.STUDY_PLAN_AI_MOCK;
    } else {
      process.env.STUDY_PLAN_AI_MOCK = originalMock;
    }

    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("is false when mock mode is on", () => {
    process.env.STUDY_PLAN_AI_MOCK = "true";
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isAiPlanLlmEnabled()).toBe(false);
  });

  it("is false without an API key", () => {
    delete process.env.STUDY_PLAN_AI_MOCK;
    delete process.env.OPENAI_API_KEY;
    expect(isAiPlanLlmEnabled()).toBe(false);
  });

  it("is true when API key is set and mock is off", () => {
    delete process.env.STUDY_PLAN_AI_MOCK;
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isAiPlanLlmEnabled()).toBe(true);
  });
});
