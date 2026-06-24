export const AI_PLAN_MODES = ["existing_subjects", "document"];

export const CHAT_INTENT_TYPES = [
  "SET_HOURS_PER_WEEK",
  "SET_PRIORITY",
  "MOVE_SUBJECT_TO_DAY",
  "NO_STUDY_AFTER",
  "REDUCE_DIFFICULTY",
  "REGENERATE_SUBJECT",
  "BLOCK_DAY",
];

/** Constraint types persisted across chat turns (subset of intents) */
export const PLAN_CONSTRAINT_TYPES = [
  "MOVE_SUBJECT_TO_DAY",
  "NO_STUDY_AFTER",
  "BLOCK_DAY",
];

/** Days from exam date to stop scheduling new sessions */
export const EXAM_BUFFER_DAYS = 7;

import { getOpenAIConfig } from "../../ai/ai.constants.js";

/** Explicit opt-in to heuristic-only mode (skips OpenAI). */
export const isAiPlanMockEnabled = () =>
  process.env.STUDY_PLAN_AI_MOCK === "true";

/** OpenAI available for plan chat and document analyze. */
export const isAiPlanLlmEnabled = () => {
  if (isAiPlanMockEnabled()) return false;
  const { apiKey } = getOpenAIConfig();
  return Boolean(apiKey);
};

export const PHASE_STATUS = {
  PENDING_SCHEDULER: "pending_phase_1",
  PENDING_APPLY: "pending_phase_2",
  PENDING_AI: "pending_phase_4",
};
