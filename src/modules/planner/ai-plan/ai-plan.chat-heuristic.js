const DAY_ALIASES = {
  monday: 0,
  mon: 0,
  t2: 0,
  "thứ 2": 0,
  tuesday: 1,
  tue: 1,
  t3: 1,
  "thứ 3": 1,
  wednesday: 2,
  wed: 2,
  t4: 2,
  "thứ 4": 2,
  thursday: 3,
  thu: 3,
  t5: 3,
  "thứ 5": 3,
  friday: 4,
  fri: 4,
  t6: 4,
  "thứ 6": 4,
  saturday: 5,
  sat: 5,
  t7: 5,
  "thứ 7": 5,
  sunday: 6,
  sun: 6,
  cn: 6,
  "chủ nhật": 6,
};

const findSubjectInMessage = (message, subjects) => {
  const lower = message.toLowerCase();
  return (
    subjects.find((subject) => lower.includes(subject.name.toLowerCase())) ||
    null
  );
};

const parseDayOfWeek = (message) => {
  const lower = message.toLowerCase();
  for (const [alias, day] of Object.entries(DAY_ALIASES)) {
    if (lower.includes(alias)) return day;
  }
  return null;
};

const parseHourBoundary = (message) => {
  const lower = message.toLowerCase();

  const afterMatch = lower.match(
    /(?:no study after|not after|after|sau|trước)\s*(\d{1,2})(?::(\d{2}))?\s*(h|pm|am|giờ)?/,
  );
  if (!afterMatch) return null;

  let hour = Number(afterMatch[1]);
  const meridiem = afterMatch[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour;
};

const parseHoursPerWeek = (message) => {
  const match = message.match(/(\d+(?:\.\d+)?)\s*(?:h|hours|giờ|hour)/i);
  return match ? Number(match[1]) : null;
};

/**
 * Rule-based chat parser used when OpenAI is unavailable.
 */
export const parseChatHeuristic = (
  message,
  { subjects = [], constraints = [] } = {},
) => {
  const lower = message.toLowerCase();
  const intents = [];
  const subject = findSubjectInMessage(message, subjects);

  const hourBoundary = parseHourBoundary(message);
  if (hourBoundary != null) {
    intents.push({ type: "NO_STUDY_AFTER", hour: hourBoundary });
  }

  if (/(block|không học|no study).*(day|ngày|thứ)/i.test(message)) {
    const dayOfWeek = parseDayOfWeek(message);
    if (dayOfWeek != null) {
      intents.push({ type: "BLOCK_DAY", dayOfWeek });
    }
  }

  const hours = parseHoursPerWeek(message);
  if (hours != null && subject) {
    intents.push({
      type: "SET_HOURS_PER_WEEK",
      subjectName: subject.name,
      value: hours,
    });
  }

  if (/(reduce difficulty|dễ hơn|giảm độ khó)/i.test(message) && subject) {
    intents.push({ type: "REDUCE_DIFFICULTY", subjectName: subject.name });
  }

  if (/(priority|ưu tiên|prioritize)/i.test(message) && subject) {
    const priority = /(high|cao)/i.test(message)
      ? "high"
      : /(low|thấp)/i.test(message)
        ? "low"
        : "medium";
    intents.push({
      type: "SET_PRIORITY",
      subjectName: subject.name,
      priority,
    });
  }

  const moveDay = parseDayOfWeek(message);
  if (
    moveDay != null &&
    subject &&
    /(move|chuyển|schedule|xếp|học)/i.test(message)
  ) {
    intents.push({
      type: "MOVE_SUBJECT_TO_DAY",
      subjectName: subject.name,
      dayOfWeek: moveDay,
    });
  }

  if (!intents.length) {
    return {
      reply:
        "I could not parse that request offline. Try: \"Physics 2 hours per week\", \"no study after 8pm\", or \"block Saturday\".",
      needsClarification: true,
      clarificationQuestion:
        "Which subject should I change, and what adjustment do you want (hours, priority, blocked day, or no study after a time)?",
      intents: [],
    };
  }

  const parts = [];
  if (intents.some((intent) => intent.type === "NO_STUDY_AFTER")) {
    parts.push(`no study after ${hourBoundary}:00`);
  }
  if (intents.some((intent) => intent.type === "SET_HOURS_PER_WEEK") && subject) {
    parts.push(`${subject.name} → ${hours}h/week`);
  }
  if (intents.some((intent) => intent.type === "BLOCK_DAY")) {
    parts.push("day blocked");
  }

  return {
    reply: `Updated plan (${parts.join(", ") || "constraints applied"}).`,
    needsClarification: false,
    clarificationQuestion: null,
    intents,
  };
};
