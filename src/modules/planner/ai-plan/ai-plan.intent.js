import { SUBJECT_DIFFICULTY } from "../../../config/constants.js";

const DIFFICULTY_ORDER = [
  SUBJECT_DIFFICULTY.EASY,
  SUBJECT_DIFFICULTY.MEDIUM,
  SUBJECT_DIFFICULTY.HARD,
];

const findSubjectByName = (subjects, subjectName) => {
  if (!subjectName) return null;
  const needle = subjectName.trim().toLowerCase();
  return (
    subjects.find((subject) => subject.name.toLowerCase() === needle) ||
    subjects.find((subject) => subject.name.toLowerCase().includes(needle)) ||
    null
  );
};

const upsertOverride = (overrides, subjectId, patch) => {
  const index = overrides.findIndex((item) => item.subjectId === subjectId);
  if (index === -1) {
    overrides.push({ subjectId, ...patch });
    return;
  }
  overrides[index] = { ...overrides[index], ...patch };
};

const reduceDifficulty = (current) => {
  const index = DIFFICULTY_ORDER.indexOf(current || SUBJECT_DIFFICULTY.MEDIUM);
  return DIFFICULTY_ORDER[Math.max(0, index - 1)];
};

/**
 * Apply whitelisted chat intents to scheduling overrides and constraints.
 */
export const applyChatIntents = ({
  subjects,
  schedulingOverrides = [],
  constraints = [],
  intents = [],
}) => {
  const nextOverrides = schedulingOverrides.map((item) => ({ ...item }));
  const nextConstraints = constraints.map((item) => ({ ...item }));
  const nextSubjects = subjects.map((subject) => ({ ...subject }));

  for (const intent of intents) {
    const subject = findSubjectByName(nextSubjects, intent.subjectName);

    switch (intent.type) {
      case "SET_HOURS_PER_WEEK":
        if (subject && intent.value != null) {
          upsertOverride(nextOverrides, subject.id, {
            hoursPerWeek: Number(intent.value),
          });
        }
        break;

      case "SET_PRIORITY":
        if (subject && intent.priority) {
          subject.priority = intent.priority;
        }
        break;

      case "REDUCE_DIFFICULTY":
        if (subject) {
          const reduced = reduceDifficulty(
            subject.difficulty || SUBJECT_DIFFICULTY.MEDIUM,
          );
          subject.difficulty = reduced;
          upsertOverride(nextOverrides, subject.id, { difficulty: reduced });
        }
        break;

      case "NO_STUDY_AFTER":
        if (intent.hour != null) {
          nextConstraints.push({
            type: "NO_STUDY_AFTER",
            hour: Number(intent.hour),
          });
        }
        break;

      case "BLOCK_DAY":
        if (intent.dayOfWeek != null) {
          nextConstraints.push({
            type: "BLOCK_DAY",
            dayOfWeek: Number(intent.dayOfWeek),
            ...(intent.weekStartDate
              ? { weekStartDate: intent.weekStartDate }
              : {}),
          });
        }
        break;

      case "MOVE_SUBJECT_TO_DAY":
        if (subject && intent.dayOfWeek != null) {
          nextConstraints.push({
            type: "MOVE_SUBJECT_TO_DAY",
            subjectId: subject.id,
            dayOfWeek: Number(intent.dayOfWeek),
          });
        }
        break;

      case "REGENERATE_SUBJECT":
        break;

      default:
        break;
    }
  }

  return {
    subjects: nextSubjects,
    schedulingOverrides: nextOverrides,
    constraints: nextConstraints,
  };
};
