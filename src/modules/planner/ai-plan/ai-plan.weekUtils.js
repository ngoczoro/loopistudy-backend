export const toDateOnly = (input) => {
  if (typeof input === "string") {
    return input.slice(0, 10);
  }

  const d = input instanceof Date ? input : new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseDate = (dateStr) => new Date(`${toDateOnly(dateStr)}T12:00:00`);

/** Monday of the week containing `input` (YYYY-MM-DD). */
export const getWeekStartDate = (input) => {
  const d = parseDate(toDateOnly(input));
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toDateOnly(d);
};

export const addDays = (dateStr, days) => {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
};

export const daysBetween = (from, to) => {
  const ms = parseDate(to) - parseDate(from);
  return Math.floor(ms / (24 * 60 * 60 * 1000));
};

export const formatWeekLabel = (weekStartDate) => {
  const start = parseDate(weekStartDate);
  const end = parseDate(addDays(weekStartDate, 6));
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
};

export const enumerateWeeks = (planStart, planEnd) => {
  const weeks = [];
  let current = getWeekStartDate(planStart);
  const endWeek = getWeekStartDate(planEnd);

  while (current <= endWeek) {
    weeks.push(current);
    current = addDays(current, 7);
  }

  return weeks;
};

export const getPlanEndDate = (examDate, bufferDays = 7) =>
  addDays(examDate, -bufferDays);
