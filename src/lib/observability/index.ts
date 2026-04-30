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
 * Initialize the observability stack.
 */
export function initObservability(config: ObservabilityConfig = {}) {
  const env = config.environment || (import.meta.env.MODE as string);
  const release = (import.meta.env.VITE_GIT_SHA as string) || 'dev';

  // 1. Set consent
  logger.setConsent(config.telemetryConsent || false);

  // 2. Init Error Reporting (Sentry)
  errorReporter.init({
    ...(config.sentryDsn !== undefined ? { dsn: config.sentryDsn } : {}),
    environment: env,
    release,
  });

  // 3. Init Tracing (OpenTelemetry)
  tracerService.init();

  // 4. Init Metrics (Web Vitals)
  meterService.init();

  // 5. Start Telemetry Sync
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
