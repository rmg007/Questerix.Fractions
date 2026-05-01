import { logger } from './logger';
import type { StudentId, SessionId } from '../../types';

// @sentry/browser is dynamically imported inside init() so it is excluded from
// the main bundle when no DSN is configured (the default MVP build).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SentryModule = any;

interface ReporterConfig {
  dsn?: string;
  environment: string;
  release: string;
  /**
   * Telemetry consent — when false, user/session context is not sent to Sentry
   * and PII keys are stripped from caller-supplied context. Per COPPA-adjacent
   * K-2 audience, default is `false` until explicit consent.
   */
  telemetryConsent?: boolean;
}

/**
 * Well-known PII keys that must never reach Sentry from caller-supplied context.
 * Stripped by `report()` and `leaveBreadcrumb()` before calling Sentry APIs.
 */
const PII_KEYS = new Set([
  'studentId',
  'student_id',
  'sessionId',
  'session_id',
  'installId',
  'install_id',
  'email',
  'name',
  'displayName',
  'display_name',
]);

/**
 * Stable per-input pseudonymization. FNV-1a 32-bit hash → 8 hex chars.
 * Not cryptographically secure — the goal is correlation pseudonymity, not
 * irreversibility. Equal inputs produce equal hashes; different inputs produce
 * effectively-different hashes. Sentry can group events by hashed user without
 * knowing the underlying studentId UUID.
 */
function pseudonymize(s: string | undefined): string | undefined {
  if (!s) return undefined;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function stripPII(
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    if (!PII_KEYS.has(k)) cleaned[k] = v;
  }
  return cleaned;
}

class ErrorReporter {
  private initialized = false;
  private sentry: SentryModule | null = null;
  private consentGranted = false;

  async init(config: ReporterConfig): Promise<void> {
    if (this.initialized) return;
    this.consentGranted = config.telemetryConsent === true;
    if (!config.dsn) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry = await import('@sentry/browser' as any);
    this.sentry = Sentry;

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      // COPPA compliance: disable default PII collection
      sendDefaultPii: false,
      // Scrub potential sensitive info from URLs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSend(event: any) {
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/\/[0-9a-f-]{36}/g, '/[id]');
        }
        return event;
      },
      // Only sample a fraction of errors in production to stay under quota
      sampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    });

    this.initialized = true;
  }

  /**
   * Update telemetry consent. Affects subsequent setContext / report / breadcrumb
   * calls. Existing buffered events in `logger` are managed there.
   */
  setConsent(granted: boolean): void {
    this.consentGranted = granted;
  }

  setContext(studentId?: StudentId, sessionId?: SessionId) {
    if (this.sentry) {
      // C5/COPPA: do not send raw IDs to Sentry. Without consent, send nothing.
      // With consent, send pseudonymous hashes so Sentry can group events by
      // student without storing the underlying UUID.
      if (this.consentGranted) {
        const studentHash = pseudonymize(studentId);
        const sessionHash = pseudonymize(sessionId);
        this.sentry.setUser(studentHash ? { id: studentHash } : null);
        this.sentry.setContext('session', sessionHash ? { id: sessionHash } : null);
      } else {
        this.sentry.setUser(null);
        this.sentry.setContext('session', null);
      }
    }
    // The local logger always receives the raw IDs (it stores them locally,
    // gated by its own consent flag for IndexedDB buffering).
    logger.setContext(studentId, sessionId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report(error: Error, context?: Record<string, any>) {
    logger.error(error.message, {
      error,
      ...(context !== undefined ? { data: context } : {}),
    });

    if (this.sentry) {
      // Strip well-known PII keys before passing to Sentry. The consent gate
      // covers user/session identity; this gate covers caller-supplied extras
      // that may contain raw IDs by accident (defense in depth).
      const cleaned = stripPII(context);
      const sentry = this.sentry;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sentry.withScope((scope: any) => {
        if (cleaned && Object.keys(cleaned).length > 0) scope.setExtras(cleaned);
        sentry.captureException(error);
      });
    }
  }

  leaveBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
    if (this.sentry) {
      const cleaned = stripPII(data);
      this.sentry.addBreadcrumb({
        message,
        ...(category !== undefined ? { category } : {}),
        ...(cleaned !== undefined && Object.keys(cleaned).length > 0 ? { data: cleaned } : {}),
        level: 'info',
      });
    }
    logger.info(message, {
      ...(category !== undefined ? { category } : {}),
      ...(data !== undefined ? { data } : {}),
    });
  }
}

export const errorReporter = new ErrorReporter();
export default errorReporter;

// Test-only re-exports — visible to Vitest via the unit test file under
// tests/unit/observability/, kept out of the public surface by convention.
export const __testing = { pseudonymize, stripPII, PII_KEYS };
