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

// vi.mock is hoisted by vitest, so the factory must NOT reference outer
// variables. We populate the mock state via a getter on the module's exported
// `tracerService` instead, then read the recorded calls back through it.
const spanState = {
  endCalls: 0,
  setStatusCalls: [] as Array<{ code: number; message: string }>,
  startSpanCalls: [] as Array<{ name: string; attributes: Record<string, unknown> }>,
};

vi.mock('@/lib/observability/tracer', () => ({
  tracerService: {
    startSpan(name: string, attributes: Record<string, unknown>) {
      spanState.startSpanCalls.push({ name, attributes });
      return {
        end: () => {
          spanState.endCalls++;
        },
        setStatus: (status: { code: number; message: string }) => {
          spanState.setStatusCalls.push(status);
        },
      };
    },
  },
}));

import { withSpan, withSpanSync } from '@/lib/observability/withSpan';
import { SPAN_NAMES } from '@/lib/observability/span-names';

beforeEach(() => {
  spanState.endCalls = 0;
  spanState.setStatusCalls = [];
  spanState.startSpanCalls = [];
});

describe('withSpan (async)', () => {
  it('passes name + attributes to startSpan', async () => {
    await withSpan(SPAN_NAMES.QUESTION.SUBMIT, { 'question.archetype': 'compare' }, async () => 42);
    expect(spanState.startSpanCalls).toHaveLength(1);
    expect(spanState.startSpanCalls[0]).toEqual({
      name: SPAN_NAMES.QUESTION.SUBMIT,
      attributes: { 'question.archetype': 'compare' },
    });
  });

  it('returns the wrapped function result', async () => {
    const out = await withSpan(SPAN_NAMES.SCENE.CREATE, {}, async () => 'hello');
    expect(out).toBe('hello');
  });

  it('calls span.end() on success', async () => {
    await withSpan(SPAN_NAMES.SCENE.CREATE, {}, async () => 1);
    expect(spanState.endCalls).toBe(1);
    expect(spanState.setStatusCalls).toHaveLength(0);
  });

  it('marks the span as error and re-throws on rejection', async () => {
    const boom = new Error('kaboom');
    await expect(
      withSpan(SPAN_NAMES.SCENE.CREATE, {}, async () => {
        throw boom;
      })
    ).rejects.toBe(boom);
    expect(spanState.setStatusCalls).toEqual([{ code: 1, message: 'Error: kaboom' }]);
    expect(spanState.endCalls).toBe(1);
  });
});

describe('withSpanSync', () => {
  it('returns the wrapped function result', () => {
    const out = withSpanSync(SPAN_NAMES.HINT.REQUEST, { 'hint.tier': 'verbal' }, () => 'sync');
    expect(out).toBe('sync');
    expect(spanState.endCalls).toBe(1);
  });

  it('marks the span as error and re-throws on synchronous throw', () => {
    const boom = new Error('sync-boom');
    expect(() =>
      withSpanSync(SPAN_NAMES.HINT.REQUEST, {}, () => {
        throw boom;
      })
    ).toThrow(boom);
    expect(spanState.setStatusCalls).toEqual([{ code: 1, message: 'Error: sync-boom' }]);
    expect(spanState.endCalls).toBe(1);
  });
});
