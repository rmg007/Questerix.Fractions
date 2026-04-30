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
}

class ErrorReporter {
  private initialized = false;
  private sentry: SentryModule | null = null;

  async init(config: ReporterConfig): Promise<void> {
    if (this.initialized) return;
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

  setContext(studentId?: StudentId, sessionId?: SessionId) {
    if (this.sentry) {
      this.sentry.setUser(studentId ? { id: studentId } : null);
      this.sentry.setContext('session', { id: sessionId });
    }
    logger.setContext(studentId, sessionId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report(error: Error, context?: Record<string, any>) {
    logger.error(error.message, {
      error,
      ...(context !== undefined ? { data: context } : {}),
    });

    if (this.sentry) {
      const sentry = this.sentry;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sentry.withScope((scope: any) => {
        if (context) scope.setExtras(context);
        sentry.captureException(error);
      });
    }
  }

  leaveBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
    if (this.sentry) {
      this.sentry.addBreadcrumb({
        message,
        ...(category !== undefined ? { category } : {}),
        ...(data !== undefined ? { data } : {}),
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
