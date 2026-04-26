/**
 * Centralized logger with __DEV__ gating.
 * Phase 10.12: replace ad-hoc console.* calls with logger methods.
 */

const DEV = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (DEV) console.debug('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (DEV) console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (DEV) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
};

export default logger;
