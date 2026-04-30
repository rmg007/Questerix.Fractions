import * as Sentry from '@sentry/browser';
import { logger } from './logger';
import type { StudentId, SessionId } from '../../types';

interface ReporterConfig {
  dsn?: string;
  environment: string;
  release: string;
}

class ErrorReporter {
  private initialized = false;

  init(config: ReporterConfig) {
    if (this.initialized) return;

    if (config.dsn) {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        // COPPA compliance: disable default PII collection
        sendDefaultPii: false,
        // Scrub potential sensitive info from URLs
        beforeSend(event) {
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
  }

  setContext(studentId?: StudentId, sessionId?: SessionId) {
    if (this.initialized) {
      Sentry.setUser(studentId ? { id: studentId } : null);
      Sentry.setContext('session', { id: sessionId });
    }
    logger.setContext(studentId, sessionId);
  }

  report(error: Error, context?: Record<string, any>) {
    // Always log to our local store
    logger.error(error.message, {
      error,
      ...(context !== undefined ? { data: context } : {}),
    });

    // Send to Sentry if initialized
    if (this.initialized) {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setExtras(context);
        }
        Sentry.captureException(error);
      });
    }
  }

  /**
   * Breadcrumb helper for Sentry to track user journey before an error.
   */
  leaveBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
    if (this.initialized) {
      Sentry.addBreadcrumb({
        message,
        ...(category !== undefined ? { category } : {}),
        ...(data !== undefined ? { data } : {}),
        level: 'info',
      });
    }
    // Also log to local store as info
    logger.info(message, {
      ...(category !== undefined ? { category } : {}),
      ...(data !== undefined ? { data } : {}),
    });
  }
}

export const errorReporter = new ErrorReporter();
export default errorReporter;
