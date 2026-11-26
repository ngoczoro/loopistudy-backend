const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

/** Console logger with a level (LOG_LEVEL). `silent` is used by the tests. */
export const createLogger = (level = "info") => {
  const limit = LEVELS[level] ?? LEVELS.info;
  const at = (name, write) => (...args) => {
    if (LEVELS[name] <= limit) write(`[ai-service] ${new Date().toISOString()} ${name}`, ...args);
  };
  return {
    error: at("error", console.error),
    warn: at("warn", console.warn),
    info: at("info", console.log),
    debug: at("debug", console.log),
  };
};
