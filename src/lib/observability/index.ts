import { errorReporter } from './errorReporter';
import { tracerService } from './tracer';
import { meterService } from './meter';
import { logger } from './logger';
import { telemetrySyncService } from './syncService';
import type { StudentId, SessionId } from '../../types';

export interface ObservabilityConfig {
  sentryDsn?: string;
  environment?: string;
  telemetryConsent?: boolean;
}

/**
 * Initialize the observability stack. Returns a promise that resolves once all
 * async (dynamically-imported) services are ready. Callers may fire-and-forget —
 * every service has a safe no-op fallback until initialization completes.
 */
export async function initObservability(config: ObservabilityConfig = {}): Promise<void> {
  const env = config.environment || (import.meta.env.MODE as string);
  const release = (import.meta.env.VITE_GIT_SHA as string) || 'dev';

  // 1. Set consent
  logger.setConsent(config.telemetryConsent || false);

  // 2. Init Error Reporting (Sentry) + Tracing (OTel) in parallel.
  //    allSettled: one failure must not block the other.
  await Promise.allSettled([
    errorReporter.init({
      ...(config.sentryDsn !== undefined ? { dsn: config.sentryDsn } : {}),
      environment: env,
      release,
    }),
    tracerService.init(),
  ]);

  // 3. Init Metrics (Web Vitals) — synchronous, no dynamic imports
  meterService.init();

  // 4. Start Telemetry Sync
  telemetrySyncService.init();

  logger.info('Observability initialized', {
    category: 'SYSTEM',
    data: { env, release, consent: config.telemetryConsent },
  });
}

/**
 * Update user context across all observability services.
 */
export function setObservabilityContext(studentId?: StudentId, sessionId?: SessionId) {
  errorReporter.setContext(studentId, sessionId);
}

export * from './logger';
export * from './errorReporter';
export * from './tracer';
export * from './meter';
export * from './syncService';
