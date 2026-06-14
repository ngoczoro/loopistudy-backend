/** Maximum plausible single quiz attempt duration (24 hours). */
export const MAX_QUIZ_DURATION_SECONDS = 86400;

export const normalizeDurationSeconds = (
  rawSeconds,
  { startedAt, submittedAt } = {},
) => {
  const parseCandidate = (value) => {
    if (value == null || value === "") {
      return null;
    }

    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num < 0) {
      return null;
    }

    if (num <= MAX_QUIZ_DURATION_SECONDS) {
      return num;
    }

    const fromMilliseconds = Math.round(num / 1000);
    if (
      fromMilliseconds >= 0 &&
      fromMilliseconds <= MAX_QUIZ_DURATION_SECONDS
    ) {
      return fromMilliseconds;
    }

    return null;
  };

  let seconds = parseCandidate(rawSeconds);

  if (seconds == null && startedAt && submittedAt) {
    const start = new Date(startedAt).getTime();
    const end = new Date(submittedAt).getTime();

    if (
      Number.isFinite(start) &&
      start > 0 &&
      Number.isFinite(end) &&
      end >= start
    ) {
      seconds = parseCandidate(Math.round((end - start) / 1000));
    }
  }

  return seconds;
};
