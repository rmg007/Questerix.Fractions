/**
 * Span helpers — reduce the `try/finally span.end()` boilerplate at scene
 * call sites. Mirrors the inline pattern in `src/persistence/middleware.ts`.
 *
 * Usage:
 *
 *   await withSpan(SPAN_NAMES.QUESTION.SUBMIT, { 'question.archetype': 'compare' }, async () => {
 *     await this.recordAttempt(result, responseMs);
 *   });
 *
 *   const result = withSpanSync(SPAN_NAMES.HINT.REQUEST, { 'hint.tier': tier }, () => {
 *     return this.advanceHintTier();
 *   });
 *
 * On exception, the span is marked with status code 1 (error) and the error
 * is re-thrown — the caller's existing error handling stays unchanged.
 *
 * The wrapper costs zero observable behavior when `VITE_OTLP_URL` is not set
 * (the tracer service short-circuits to a no-op span).
 *
 * Phase 12 follow-on (code-quality-2026-05-01).
 */

import { tracerService } from './tracer';
import type { SpanName } from './span-names';

type SpanAttributes = Record<string, string | number | boolean | undefined>;

export async function withSpan<T>(
  name: SpanName,
  attributes: SpanAttributes,
  fn: () => Promise<T>
): Promise<T> {
  const span = tracerService.startSpan(name, attributes);
  try {
    const result = await fn();
    span.end();
    return result;
  } catch (err) {
    span.setStatus({ code: 1, message: String(err) });
    span.end();
    throw err;
  }
}

export function withSpanSync<T>(name: SpanName, attributes: SpanAttributes, fn: () => T): T {
  const span = tracerService.startSpan(name, attributes);
  try {
    const result = fn();
    span.end();
    return result;
  } catch (err) {
    span.setStatus({ code: 1, message: String(err) });
    span.end();
    throw err;
  }
}
