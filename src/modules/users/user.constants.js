/** Frontend Settings uses Mon–Sun labels; DB stores day_of_week 0–6 (Mon=0). */
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEFAULT_POMODORO_DURATION_MIN = 25;
export const DEFAULT_BREAK_DURATION_MIN = 5;

export const dayLabelToNumber = (day) => {
  const index = DAY_LABELS.indexOf(day);
  return index === -1 ? null : index;
};

export const dayNumberToLabel = (dayOfWeek) => DAY_LABELS[dayOfWeek] ?? null;
