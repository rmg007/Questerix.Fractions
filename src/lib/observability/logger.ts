import { db } from '../../persistence/db';
import type { TelemetrySeverity, TelemetryEvent, StudentId, SessionId } from '../../types';

/**
 * Metadata for the current build, injected by Vite.
 */
const BUILD_INFO = {
  version: (import.meta.env.VITE_GIT_SHA as string) || 'dev',
  timestamp: (import.meta.env.VITE_BUILD_TIME as string) || new Date().toISOString(),
};

export interface LogOptions {
  category?: string;
  data?: Record<string, unknown>;
  studentId?: StudentId;
  sessionId?: SessionId;
  error?: Error;
}

class Logger {
  private consentGranted = false;
  private studentId: StudentId | undefined;
  private sessionId: SessionId | undefined;

  setConsent(granted: boolean) {
    this.consentGranted = granted;
  }

  setContext(studentId?: StudentId, sessionId?: SessionId) {
    this.studentId = studentId;
    this.sessionId = sessionId;
  }

  debug(event: string, options?: LogOptions) {
    this.log('debug', event, options);
  }

  info(event: string, options?: LogOptions) {
    this.log('info', event, options);
  }

  warn(event: string, options?: LogOptions) {
    this.log('warn', event, options);
  }

  error(event: string, options?: LogOptions) {
    this.log('error', event, options);
  }

  fatal(event: string, options?: LogOptions) {
    this.log('fatal', event, options);
  }

  private log(severity: TelemetrySeverity, event: string, options?: LogOptions) {
    const isDev = import.meta.env.DEV;

    // Console output for DX
    if (isDev || severity === 'error' || severity === 'fatal' || severity === 'warn') {
      const label = `[${severity.toUpperCase()}] ${options?.category ? `[${options.category}] ` : ''}${event}`;
      const consoleArgs = options?.data ? [label, options.data] : [label];

      if (options?.error) {
        console.error(label, options.error, options.data);
      } else {
        (
          console[
            severity === 'fatal'
              ? 'error'
              : severity === 'debug'
                ? 'debug'
                : severity === 'info'
                  ? 'info'
                  : 'warn'
          ] || console.log
        )(...consoleArgs);
      }
    }

    // Persistent storage (ring buffer) - only if consent granted or if it's a critical system error
    // For now, let's stick to the consent rule strictly as per COPPA requirements.
    if (this.consentGranted) {
      this.bufferEvent(severity, event, options);
    }
  }

  private async bufferEvent(severity: TelemetrySeverity, event: string, options?: LogOptions) {
    try {
      const studentId = options?.studentId ?? this.studentId;
      const sessionId = options?.sessionId ?? this.sessionId;
      const stack = options?.error?.stack;
      const telemetryEvent: TelemetryEvent = {
        timestamp: new Date().toISOString(),
        event,
        severity,
        properties: {
          ...(options?.category !== undefined ? { category: options.category } : {}),
          ...options?.data,
        },
        ...(studentId !== undefined ? { studentId } : {}),
        ...(sessionId !== undefined ? { sessionId } : {}),
        ...(stack !== undefined ? { stack } : {}),
        version: BUILD_INFO.version,
        syncState: 'local',
      };

      await db.telemetryEvents.add(telemetryEvent);

      // Simple ring buffer logic: if more than 1000 events, trim old ones.
      // This can be moved to a periodic worker, but for MVP we do it occasionally.
      if (Math.random() < 0.01) {
        this.trimBuffer();
      }
    } catch (err) {
      // Fail silently to avoid recursion or crash-loops
      if (import.meta.env.DEV) {
        console.error('Failed to buffer telemetry event:', err);
      }
    }
  }

  private async trimBuffer() {
    try {
      const count = await db.telemetryEvents.count();
      if (count > 1000) {
        const [oldestToKeep] = await db.telemetryEvents
          .orderBy('id')
          .offset(count - 1000)
          .limit(1)
          .primaryKeys();

        if (oldestToKeep !== undefined) {
          await db.telemetryEvents.where('id').below(oldestToKeep).delete();
        }
      }
    } catch (err) {
      // Fail silently
    }
  }
}

export const logger = new Logger();
export default logger;
