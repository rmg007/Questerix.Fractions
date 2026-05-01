/**
 * Tests for the withSpan / withSpanSync helpers used to wrap scene-level
 * instrumentation in the question-flow / scene-lifecycle / hint paths.
 *
 * Validates that:
 *   - The wrapped function runs and returns its result
 *   - span.end() fires on the success path
 *   - span.setStatus(code: 1) + span.end() fire on the error path
 *   - The error is re-thrown so caller-side error handling is unchanged
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const endMock = vi.fn();
const setStatusMock = vi.fn();
const startSpanMock = vi.fn(() => ({
  end: endMock,
  setStatus: setStatusMock,
}));

// Mock the tracer service so the helpers see a controlled span object
vi.mock('@/lib/observability/tracer', () => ({
  tracerService: { startSpan: startSpanMock },
}));

import { withSpan, withSpanSync } from '@/lib/observability/withSpan';
import { SPAN_NAMES } from '@/lib/observability/span-names';

beforeEach(() => {
  endMock.mockClear();
  setStatusMock.mockClear();
  startSpanMock.mockClear();
});

describe('withSpan (async)', () => {
  it('passes name + attributes to startSpan', async () => {
    await withSpan(SPAN_NAMES.QUESTION.SUBMIT, { 'question.archetype': 'compare' }, async () => 42);
    expect(startSpanMock).toHaveBeenCalledWith(SPAN_NAMES.QUESTION.SUBMIT, {
      'question.archetype': 'compare',
    });
  });

  it('returns the wrapped function result', async () => {
    const out = await withSpan(SPAN_NAMES.SCENE.CREATE, {}, async () => 'hello');
    expect(out).toBe('hello');
  });

  it('calls span.end() on success', async () => {
    await withSpan(SPAN_NAMES.SCENE.CREATE, {}, async () => 1);
    expect(endMock).toHaveBeenCalledTimes(1);
    expect(setStatusMock).not.toHaveBeenCalled();
  });

  it('marks the span as error and re-throws on rejection', async () => {
    const boom = new Error('kaboom');
    await expect(
      withSpan(SPAN_NAMES.SCENE.CREATE, {}, async () => {
        throw boom;
      })
    ).rejects.toBe(boom);
    expect(setStatusMock).toHaveBeenCalledWith({ code: 1, message: 'Error: kaboom' });
    expect(endMock).toHaveBeenCalledTimes(1);
  });
});

describe('withSpanSync', () => {
  it('returns the wrapped function result', () => {
    const out = withSpanSync(SPAN_NAMES.HINT.REQUEST, { 'hint.tier': 'verbal' }, () => 'sync');
    expect(out).toBe('sync');
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it('marks the span as error and re-throws on synchronous throw', () => {
    const boom = new Error('sync-boom');
    expect(() =>
      withSpanSync(SPAN_NAMES.HINT.REQUEST, {}, () => {
        throw boom;
      })
    ).toThrow(boom);
    expect(setStatusMock).toHaveBeenCalledWith({ code: 1, message: 'Error: sync-boom' });
    expect(endMock).toHaveBeenCalledTimes(1);
  });
});
