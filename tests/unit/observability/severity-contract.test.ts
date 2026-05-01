/**
 * Severity-contract guards (Phase 12.4).
 *
 * The README documents a fixed routing table:
 *   - `fatal` → always invokes `errorReporter.report()` (Sentry capture, no
 *     consent gate, since fatals are session-ending and cannot be opted out).
 *   - `warn` → local only. Must NOT touch errorReporter.
 *
 * These two assertions pin the contract. Drift between the doc and the
 * implementation is the failure mode this file detects.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { errorReporter } from '@/lib/observability';
import { log } from '@/lib/log';

describe('severity contract — fatal routes to errorReporter', () => {
  let reportSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on the singleton, leave the implementation as-is so the local
    // logger.error path inside report() still runs without throwing.
    reportSpy = vi.spyOn(errorReporter, 'report').mockImplementation(() => {});
    // Silence console noise from the structured logger.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('log.fatal() invokes errorReporter.report()', () => {
    log.fatal('SCENE', 'unrecoverable scene crash');
    expect(reportSpy).toHaveBeenCalledTimes(1);
  });

  it('log.fatal() forwards an Error instance when one is supplied as data', () => {
    const boom = new Error('boom');
    log.fatal('Q', 'validator threw', boom);
    expect(reportSpy).toHaveBeenCalledTimes(1);
    const [errArg] = reportSpy.mock.calls[0]!;
    expect(errArg).toBe(boom);
  });

  it('log.fatal() synthesizes an Error from the event string when no Error is supplied', () => {
    log.fatal('Q', 'validator threw');
    expect(reportSpy).toHaveBeenCalledTimes(1);
    const [errArg] = reportSpy.mock.calls[0]!;
    expect(errArg).toBeInstanceOf(Error);
    expect((errArg as Error).message).toBe('validator threw');
  });

  it('log.fatal() passes category + caller-supplied data as Sentry context', () => {
    log.fatal('SCENE', 'scene-graph desync', { sceneKey: 'Level01Scene', step: 4 });
    expect(reportSpy).toHaveBeenCalledTimes(1);
    const [, ctxArg] = reportSpy.mock.calls[0]!;
    expect(ctxArg).toMatchObject({
      category: 'SCENE',
      sceneKey: 'Level01Scene',
      step: 4,
    });
  });
});

describe('severity contract — warn stays local', () => {
  let reportSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reportSpy = vi.spyOn(errorReporter, 'report').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('log.warn() does NOT invoke errorReporter.report()', () => {
    log.warn('Q', 'cache miss; falling back to bundle');
    expect(reportSpy).not.toHaveBeenCalled();
  });

  it('log.error() does NOT invoke errorReporter.report() directly', () => {
    // `error` lands in the local logger only; Sentry forwarding for the
    // `error` severity goes through errorReporter.report() called explicitly
    // at the catch site, NOT via the structured logger.
    log.error('Q', 'validator returned invalid result');
    expect(reportSpy).not.toHaveBeenCalled();
  });
});
