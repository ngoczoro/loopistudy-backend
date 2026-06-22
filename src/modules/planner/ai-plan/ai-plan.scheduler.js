import { dayLabelToNumber } from "../../users/user.constants.js";
import { EXAM_BUFFER_DAYS } from "./ai-plan.constants.js";
import {
  addDays,
  enumerateWeeks,
  formatWeekLabel,
  getPlanEndDate,
  getWeekStartDate,
  parseDate,
  toDateOnly,
} from "./ai-plan.weekUtils.js";

const SESSION_TITLES = ["Review", "Practice", "Deep Study", "Study"];
const MIN_DURATION = 0.5;
const MAX_SESSIONS_PER_SUBJECT_PER_DAY = 1; 
const SCHEDULE_START_HOUR = 8;
const SCHEDULE_END_HOUR = 20;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const DEFAULT_MAX_STUDY_HOURS_PER_DAY = 4;
const RELAXED_DAILY_OVERFLOW_HOURS = 1;

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };
const DIFFICULTY_WEIGHT = { Hard: 3, Medium: 2, Easy: 1 };

const preferredHoursByDifficulty = {
  Hard: [8, 9, 10, 11],
  Medium: [9, 10, 11, 13, 14, 15],
  Easy: [13, 14, 15, 16, 17],
};

const defaultDurationByDifficulty = {
  Hard: 2,
  Medium: 1.5,
  Easy: 1,
};

const getPreferredMinGap = (sessionCount) => {
  if (sessionCount <= 1) return 0;
  if (sessionCount === 2) return 3;
  if (sessionCount === 3) return 2;
  return 1;
};

const getIdealGap = (sessionCount) => {
  if (sessionCount <= 1) return 0;
  return Math.floor(7 / sessionCount);
};

export const getMaxSubjectsPerDay = (subjectCount) => {
  if (subjectCount <= 3) return 1;
  if (subjectCount <= 6) return 3;
  if (subjectCount <= 10) return 4;
  return 5;
};

const intervalsOverlap = (startA, durA, startB, durB) => {
  const endA = startA + durA;
  const endB = startB + durB;
  return startA < endB && endA > startB;
};

const normalizeBlockedSlots = (blockedSlots = []) =>
  blockedSlots
    .map((slot) => ({
      dayOfWeek:
        typeof slot.day === "string"
          ? dayLabelToNumber(slot.day)
          : Number(slot.dayOfWeek ?? slot.day),
      hour: Number(slot.hour),
    }))
    .filter((slot) => slot.dayOfWeek != null && !Number.isNaN(slot.hour));

const normalizeExistingSession = (session) => ({
  weekStartDate: session.weekStartDate,
  dayOfWeek: Number(session.dayOfWeek ?? session.day),
  startHour: Number(session.startHour ?? session.start),
  durationHours: Number(session.durationHours ?? session.duration),
  source: session.source ?? "manual",
  subjectId: session.subjectId ?? null,
});

const overlapsBlocked = (dayOfWeek, startHour, durationHours, blockedSlots) => {
  const end = startHour + durationHours;
  for (const slot of blockedSlots) {
    if (slot.dayOfWeek !== dayOfWeek) continue;
    const blockedStart = slot.hour;
    const blockedEnd = blockedStart + 1;
    if (startHour < blockedEnd && end > blockedStart) return true;
  }
  return false;
};

const overlapsPlacedOnDay = (startHour, durationHours, daySessions) =>
  daySessions.some((s) =>
    intervalsOverlap(startHour, durationHours, s.startHour, s.durationHours)
  );

const isDayBlockedByConstraints = (weekStartDate, dayOfWeek, constraints = []) => {
  for (const constraint of constraints) {
    if (constraint.type !== "BLOCK_DAY") continue;
    const blockedDay = Number(constraint.dayOfWeek);
    if (Number.isNaN(blockedDay) || blockedDay !== dayOfWeek) continue;
    if (constraint.weekStartDate && constraint.weekStartDate !== weekStartDate) continue;
    return true;
  }
  return false;
};

const violatesNoStudyAfter = (startHour, durationHours, constraints = []) => {
  for (const constraint of constraints) {
    if (constraint.type !== "NO_STUDY_AFTER") continue;
    const maxEnd = Number(constraint.hour);
    if (!Number.isNaN(maxEnd) && startHour + durationHours > maxEnd) return true;
  }
  return false;
};

const getSubjectScore = (subject, referenceDate) => {
  const priority = PRIORITY_WEIGHT[subject.priority || "medium"] ?? 2;
  const difficulty = DIFFICULTY_WEIGHT[subject.difficulty || "Medium"] ?? 2;
  const planEnd = getPlanEndDate(subject.examDate, EXAM_BUFFER_DAYS);
  const daysLeft = Math.max(
    1,
    Math.ceil((parseDate(planEnd) - parseDate(referenceDate)) / 86400000),
  );
  const urgency = 1 + 30 / daysLeft;
  return priority * difficulty * urgency;
};

const getWeeklyHours = (subject) => {
  const hours = Number(subject.requiredHoursPerWeek ?? subject.credits ?? 3);
  return Math.max(0, hours);
};

const splitWeeklyHours = (totalHours, chunkDuration) => {
  if (totalHours <= 0) return [];
  const sessions = [];
  let remaining = totalHours;
  while (remaining >= MIN_DURATION - 0.001) {
    const duration = Math.min(chunkDuration, remaining);
    sessions.push(Math.round(duration * 2) / 2);
    remaining = Math.round((remaining - duration) * 2) / 2;
  }
  return sessions;
};

const buildSessionTitle = (subjectName, index) => {
  const suffix = SESSION_TITLES[index % SESSION_TITLES.length];
  return `${subjectName} — ${suffix}`;
};

const candidateHours = (difficulty) => {
  const preferred =
    preferredHoursByDifficulty[difficulty] ?? preferredHoursByDifficulty.Medium;
  const fallbacks = [];
  for (let h = SCHEDULE_START_HOUR; h < SCHEDULE_END_HOUR; h += 0.5) {
    fallbacks.push(h);
  }
  return [...new Set([...preferred, ...fallbacks])];
};

const getConstraintPreferredDays = (subjectId, constraints = []) => {
  const preferred = constraints
    .filter(
      (c) => c.type === "MOVE_SUBJECT_TO_DAY" && c.subjectId === subjectId,
    )
    .map((c) => Number(c.dayOfWeek))
    .filter((day) => !Number.isNaN(day));
  return [...new Set(preferred)];
};

export const buildAnchorDays = (subjects) => {
  const map = new Map();
  subjects.forEach((subject, index) => {
    map.set(subject.id, index % 7);
  });
  return map;
};

export const circularDayDistance = (dayA, dayB) => {
  const diff = Math.abs(dayA - dayB);
  return Math.min(diff, 7 - diff);
};

const getWeekLoadMetrics = (placed, obstacles, weekStartDate) => {
  const totalDistinctMap = new Array(7).fill(0).map(() => new Set());
  const placedSubjectCounts = new Array(7).fill(0).map(() => new Map()); 
  const hoursMap = new Array(7).fill(0);
  const sessionsByDay = new Array(7).fill(0).map(() => []); 

  const processSession = (s, isPlacedSource) => {
    if (s.weekStartDate === weekStartDate) {
      if (s.subjectId) {
        totalDistinctMap[s.dayOfWeek].add(s.subjectId);
        
        if (isPlacedSource) {
          const currentCount = placedSubjectCounts[s.dayOfWeek].get(s.subjectId) ?? 0;
          placedSubjectCounts[s.dayOfWeek].set(s.subjectId, currentCount + 1);
        }
      }
      hoursMap[s.dayOfWeek] += Number(s.durationHours || 0);
      sessionsByDay[s.dayOfWeek].push(s);
    }
  };

  placed.forEach((s) => processSession(s, true));
  obstacles.forEach((s) => processSession(s, false));

  return {
    distinctCounts: totalDistinctMap.map((set) => set.size),
    totalHours: hoursMap,
    placedSubjectCounts,
    sessionsByDay, 
  };
};

const scoreSlot = ({
  dayOfWeek,
  startHour,
  subject,
  existingDays,
  metrics,
  referenceDate,
  sessionCount,
  maxStudyHoursPerDay,
}) => {
  let score = 0;

  if (existingDays.length === 0) {
    score += 30;
  } else {
    const minGap = Math.min(
      ...existingDays.map((d) => circularDayDistance(dayOfWeek, d)),
    );
    const idealGap = getIdealGap(sessionCount);
    const spacingScore = Math.max(0, 20 - Math.abs(minGap - idealGap) * 5);
    score += spacingScore;
    // Prefer wider spacing between same-subject sessions (spaced repetition).
    score += minGap * 6;
    if (minGap <= 1) score -= 18;
  }
  const preferred = preferredHoursByDifficulty[subject.difficulty] ?? preferredHoursByDifficulty.Medium;
  if (preferred.includes(startHour)) score += 20;

  const distinctOnDay = metrics.distinctCounts[dayOfWeek];
  score -= distinctOnDay * 8;

  const usedHours = metrics.totalHours[dayOfWeek];
  const loadRatio = usedHours / maxStudyHoursPerDay;
  score -= Math.pow(loadRatio, 2) * 15; 

  const difficulty = subject.difficulty || "Medium";
  if (difficulty === "Hard" && startHour <= 10) score += 15;
  else if (difficulty === "Easy" && startHour >= 13) score += 10;

  const planEnd = getPlanEndDate(subject.examDate, EXAM_BUFFER_DAYS);
  const daysLeft = Math.max(
    1,
    Math.ceil((parseDate(planEnd) - parseDate(referenceDate)) / 86400000),
  );
  score += Math.min(20, Math.floor(30 / daysLeft) * 5);

  return score;
};

const buildDayOrder = ({
  subjectId,
  anchorDay,
  constraints,
  existingDays,
  metrics,
  maxSubjectsPerDay,
  preferredMinGap,
}) => {
  const constraintDays = getConstraintPreferredDays(subjectId, constraints);

  const candidates = ALL_DAYS.map((day) => {
    const currentSubjectSessionsOnDay = metrics.placedSubjectCounts[day].get(subjectId) ?? 0;
    const distinctCount = metrics.distinctCounts[day];

    const canPlace = currentSubjectSessionsOnDay < MAX_SESSIONS_PER_SUBJECT_PER_DAY && distinctCount < maxSubjectsPerDay;

    return {
      day,
      distinctOnDay: distinctCount,
      isConstraintDay: constraintDays.includes(day),
      isAnchorDay: day === anchorDay,
      canPlace,
      meetsGap: existingDays.length === 0
        ? true
        : existingDays.every((d) => circularDayDistance(day, d) >= preferredMinGap),
      minGapToNearest: existingDays.length === 0
        ? Infinity
        : Math.min(...existingDays.map((d) => circularDayDistance(day, d))),
    };
  });

  return candidates
    .filter((item) => item.canPlace && item.meetsGap)
    .sort((a, b) => {
      if (a.isConstraintDay !== b.isConstraintDay) return a.isConstraintDay ? -1 : 1;

      const aFirst = a.minGapToNearest === Infinity;
      const bFirst = b.minGapToNearest === Infinity;
      if (aFirst !== bFirst) return aFirst ? -1 : 1;

      if (aFirst && bFirst) {
        if (a.isAnchorDay !== b.isAnchorDay) return a.isAnchorDay ? -1 : 1;
        if (a.distinctOnDay !== b.distinctOnDay) return a.distinctOnDay - b.distinctOnDay;
        return a.day - b.day;
      }

      if (a.minGapToNearest !== b.minGapToNearest) return b.minGapToNearest - a.minGapToNearest;
      if (a.distinctOnDay !== b.distinctOnDay) return a.distinctOnDay - b.distinctOnDay;
      return a.day - b.day;
    })
    .map((item) => item.day);
};

const tryPlaceSession = ({
  weekStartDate,
  subject,
  durationHours,
  title,
  blockedSlots,
  obstacles,
  placed,
  constraints,
  maxSubjectsPerDay,
  anchorDay,
  maxStudyHoursPerDay,
  referenceDate,
  relaxedMode = false,
  sessionCount = 0,
}) => {
  const difficulty = subject.difficulty || "Medium";

  const hours = relaxedMode
    ? Array.from(
        { length: (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) * 2 },
        (_, i) => SCHEDULE_START_HOUR + i * 0.5,
      )
    : candidateHours(difficulty);

  const calculatedMinGap = getPreferredMinGap(sessionCount);
  const preferredMinGap = relaxedMode
    ? Math.max(1, calculatedMinGap - 1)
    : calculatedMinGap;

  const metrics = getWeekLoadMetrics(placed, obstacles, weekStartDate);
  const existingDays = placed
    .filter((s) => s.weekStartDate === weekStartDate && s.subjectId === subject.id)
    .map((s) => s.dayOfWeek);

  let dayOrder = buildDayOrder({
    subjectId: subject.id,
    anchorDay,
    constraints,
    existingDays,
    metrics,
    maxSubjectsPerDay,
    preferredMinGap,
  });

  if (dayOrder.length === 0 && relaxedMode) {
    dayOrder = buildDayOrder({
      subjectId: subject.id,
      anchorDay,
      constraints,
      existingDays,
      metrics,
      maxSubjectsPerDay,
      preferredMinGap: 1,
    });
  }

  const effectiveMaxHours = relaxedMode
    ? maxStudyHoursPerDay + RELAXED_DAILY_OVERFLOW_HOURS
    : maxStudyHoursPerDay;

  const validSlots = [];

  for (const dayOfWeek of dayOrder) {
    if (isDayBlockedByConstraints(weekStartDate, dayOfWeek, constraints)) continue;

    const hoursOnDay = metrics.totalHours[dayOfWeek];
    if (hoursOnDay + durationHours > effectiveMaxHours) continue;

    const daySessions = metrics.sessionsByDay[dayOfWeek];

    for (const startHour of hours) {
      if (startHour + durationHours > SCHEDULE_END_HOUR) continue;
      if (violatesNoStudyAfter(startHour, durationHours, constraints)) continue;
      if (overlapsBlocked(dayOfWeek, startHour, durationHours, blockedSlots)) continue;
      
      // Sửa Issue 2: Quét overlap cục bộ theo ngày, độ phức tạp giảm cực lớn
      if (overlapsPlacedOnDay(startHour, durationHours, daySessions)) continue;

      const slotScore = scoreSlot({
        dayOfWeek,
        startHour,
        subject,
        existingDays,
        metrics,
        referenceDate,
        sessionCount,
        maxStudyHoursPerDay,
      });

      validSlots.push({ dayOfWeek, startHour, slotScore });
    }
  }

  if (validSlots.length === 0) return null;

  validSlots.sort((a, b) => b.slotScore - a.slotScore);
  const best = validSlots[0];

  return {
    subjectId: subject.id,
    title,
    dayOfWeek: best.dayOfWeek,
    startHour: best.startHour,
    durationHours,
    weekStartDate,
    color: subject.color ?? null,
    source: "ai_plan",
  };
};

const subjectActiveInWeek = (subject, weekStartDate) => {
  const planEnd = getPlanEndDate(subject.examDate, EXAM_BUFFER_DAYS);
  return weekStartDate <= getWeekStartDate(planEnd);
};

export const runScheduler = ({
  subjects,
  planStart,
  blockedSlots = [],
  existingSessions = [],
  scopeSubjectIds = [],
  constraints = [],
  maxStudyHoursPerDay = DEFAULT_MAX_STUDY_HOURS_PER_DAY,
}) => {
  const warnings = [];
  const placed = [];
  const scopeSet = new Set(scopeSubjectIds);

  const obstacles = existingSessions.map(normalizeExistingSession).filter((session) => {
    if (session.source === "manual" || session.source === "ics_import") return true;
    if (session.source === "ai_plan") {
      return !session.subjectId || !scopeSet.has(session.subjectId);
    }
    return true;
  });

  const normalizedBlocked = normalizeBlockedSlots(blockedSlots);

  const activeSubjects = subjects.filter((subject) => {
    if (!subject.examDate) {
      warnings.push(`${subject.name}: missing exam date — skipped`);
      return false;
    }
    const planEnd = getPlanEndDate(subject.examDate, EXAM_BUFFER_DAYS);
    if (planEnd < planStart) {
      warnings.push(
        `${subject.name}: exam is within ${EXAM_BUFFER_DAYS} days — no sessions scheduled`,
      );
      return false;
    }
    return true;
  });

  if (activeSubjects.length === 0) return { sessions: [], warnings };

  const planEnd = activeSubjects.reduce((latest, subject) => {
    const end = getPlanEndDate(subject.examDate, EXAM_BUFFER_DAYS);
    return end > latest ? end : latest;
  }, planStart);

  const weeks = enumerateWeeks(planStart, planEnd);
  const maxSubjectsPerDay = getMaxSubjectsPerDay(activeSubjects.length);

  for (const weekStartDate of weeks) {
    const weekSubjects = activeSubjects
      .filter((subject) => subjectActiveInWeek(subject, weekStartDate))
      .sort((a, b) => getSubjectScore(b, weekStartDate) - getSubjectScore(a, weekStartDate));

    const anchorDays = buildAnchorDays(weekSubjects);

    const subjectQueues = weekSubjects.map((subject) => {
      const weeklyHours = getWeeklyHours(subject);
      const difficulty = subject.difficulty || "Medium";
      const chunkDuration = defaultDurationByDifficulty[difficulty] ?? 1.5;
      const durations = splitWeeklyHours(weeklyHours, chunkDuration);
      return { subject, durations };
    });

    const maxRounds = subjectQueues.reduce(
      (max, queue) => Math.max(max, queue.durations.length),
      0,
    );

    for (let round = 0; round < maxRounds; round += 1) {
      for (const { subject, durations } of subjectQueues) {
        if (round >= durations.length) continue;

        const durationHours = durations[round];
        const commonArgs = {
          weekStartDate,
          subject,
          durationHours,
          title: buildSessionTitle(subject.name, round),
          blockedSlots: normalizedBlocked,
          obstacles,
          placed,
          constraints,
          maxSubjectsPerDay,
          anchorDay: anchorDays.get(subject.id) ?? 0,
          maxStudyHoursPerDay,
          referenceDate: weekStartDate,
          sessionCount: durations.length,
        };

        let session = tryPlaceSession({ ...commonArgs, relaxedMode: false });

        if (!session) {
          session = tryPlaceSession({ ...commonArgs, relaxedMode: true });
        }

        if (session) {
          placed.push(session);
        } else {
          warnings.push(
            `${subject.name}: could not place ${durationHours}h session in week of ${weekStartDate}`,
          );
        }
      }
    }
  }

  return { sessions: placed, warnings };
};

export const groupSessionsByWeek = (sessions) => {
  const map = new Map();
  for (const session of sessions) {
    if (!map.has(session.weekStartDate)) map.set(session.weekStartDate, []);
    map.get(session.weekStartDate).push(session);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartDate, weekSessions]) => {
      const totalHours = weekSessions.reduce((sum, s) => sum + Number(s.durationHours), 0);
      return {
        weekStartDate,
        label: formatWeekLabel(weekStartDate),
        totalHours: Math.round(totalHours * 10) / 10,
        sessions: weekSessions.sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
          return a.startHour - b.startHour;
        }),
      };
    });
};

export const buildPlanSummary = (sessions, subjects) => {
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const totals = new Map();
  for (const session of sessions) {
    const current = totals.get(session.subjectId) ?? {
      subjectId: session.subjectId,
      subjectName: subjectMap.get(session.subjectId) ?? "Unknown",
      totalSessions: 0,
      totalHours: 0,
    };
    current.totalSessions += 1;
    current.totalHours += Number(session.durationHours);
    totals.set(session.subjectId, current);
  }
  return [...totals.values()].map((item) => ({
    ...item,
    totalHours: Math.round(item.totalHours * 10) / 10,
  }));
};

export const buildReplacePreview = (existingSessions, scopeSubjectIds, subjects) => {
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const scopeSet = new Set(scopeSubjectIds);
  const counts = new Map();
  for (const session of existingSessions) {
    const normalized = normalizeExistingSession(session);
    if (normalized.source !== "ai_plan") continue;
    if (!normalized.subjectId || !scopeSet.has(normalized.subjectId)) continue;
    counts.set(normalized.subjectId, (counts.get(normalized.subjectId) ?? 0) + 1);
  }
  return scopeSubjectIds.map((subjectId) => ({
    subjectId,
    subjectName: subjectMap.get(subjectId) ?? "Unknown",
    countToReplace: counts.get(subjectId) ?? 0,
  }));
};

export const resolvePlanStart = () => toDateOnly(new Date());