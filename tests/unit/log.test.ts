import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the observability logger before importing log module
vi.mock('@/lib/observability', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  log,
  getRing,
  RING_SIZE,
  setContext,
  patchContext,
  getContext,
  perfMark,
  timed,
  timedSync,
  logAssert,
} from '@/lib/log';

beforeEach(() => {
  // Clear ring buffer between tests
  const ring = getRing() as unknown[];
  ring.length = 0;
  setContext({});
});

describe('log categories', () => {
  it('exposes all Phase 10 categories', () => {
    const expected = [
      'scene', 'tmpl', 'q', 'drag', 'input', 'valid', 'hint',
      'sess', 'atmp', 'bkt', 'misc', 'perf',
      'lifecycle', 'net', 'pwa', 'a11y', 'tts', 'storage', 'migrate', 'errBoundary',
      'warn', 'error',
    ];
    for (const cat of expected) {
      expect(typeof (log as Record<string, unknown>)[cat]).toBe('function');
    }
  });
});

describe('ring buffer', () => {
  it('captures log entries', () => {
    log.scene('test_event', { foo: 1 });
    const ring = getRing();
    expect(ring.length).toBe(1);
    expect(ring[0]!.cat).toBe('SCENE');
    expect(ring[0]!.event).toBe('test_event');
    expect(ring[0]!.data).toEqual({ foo: 1 });
  });

  it('caps at RING_SIZE entries', () => {
    for (let i = 0; i < RING_SIZE + 50; i++) {
      log.perf(`evt_${i}`);
    }
    expect(getRing().length).toBe(RING_SIZE);
  });

  it('evicts oldest entries first (FIFO)', () => {
    for (let i = 0; i < RING_SIZE + 10; i++) {
      log.perf(`evt_${i}`);
    }
    const ring = getRing();
    expect(ring[0]!.event).toBe('evt_10');
    expect(ring[ring.length - 1]!.event).toBe(`evt_${RING_SIZE + 9}`);
  });
});

describe('ambient context', () => {
  it('setContext replaces the entire context', () => {
    setContext({ traceId: 'abc' });
    expect(getContext()).toEqual({ traceId: 'abc' });
    setContext({ sessionId: 'xyz' });
    expect(getContext()).toEqual({ sessionId: 'xyz' });
  });

  it('patchContext merges into existing context', () => {
    setContext({ a: 1 });
    patchContext({ b: 2 });
    expect(getContext()).toEqual({ a: 1, b: 2 });
  });

  it('attaches context snapshot to ring entries', () => {
    setContext({ traceId: 't1' });
    log.scene('with_ctx');
    const ring = getRing();
    expect(ring[0]!.ctx).toEqual({ traceId: 't1' });
  });

  it('omits ctx field when context is empty', () => {
    setContext({});
    log.scene('no_ctx');
    const ring = getRing();
    expect(ring[0]!.ctx).toBeUndefined();
  });
});

describe('perfMark', () => {
  it('calls performance.mark without throwing', () => {
    const spy = vi.spyOn(performance, 'mark');
    perfMark('test_mark');
    expect(spy).toHaveBeenCalledWith('test_mark');
    spy.mockRestore();
  });
});

describe('timed', () => {
  it('returns the result of the async function', async () => {
    const result = await timed('async_op', async () => 42);
    expect(result).toBe(42);
  });

  it('emits a PERF ring entry with ms', async () => {
    await timed('my_op', async () => {});
    const ring = getRing();
    const entry = ring.find((e) => e.event === 'my_op');
    expect(entry).toBeDefined();
    expect(entry!.cat).toBe('PERF');
    expect((entry!.data as { ms: number }).ms).toBeGreaterThanOrEqual(0);
  });
});

describe('timedSync', () => {
  it('returns the result of the sync function', () => {
    const result = timedSync('sync_op', () => 'hello');
    expect(result).toBe('hello');
  });

  it('emits a PERF ring entry', () => {
    timedSync('sync_label', () => {});
    const ring = getRing();
    const entry = ring.find((e) => e.event === 'sync_label');
    expect(entry).toBeDefined();
  });
});

describe('logAssert', () => {
  it('does nothing when condition is true', () => {
    expect(() => logAssert(true, 'should not fire')).not.toThrow();
  });

  it('throws in DEV when condition is false', () => {
    // import.meta.env.DEV is true in vitest/jsdom
    expect(() => logAssert(false, 'boom')).toThrow('[ASSERT] boom');
  });
});

describe('warn/error always emit to ring', () => {
  it('warn entries have lvl=warn', () => {
    log.warn('TEST', 'warning_event');
    const ring = getRing();
    const entry = ring.find((e) => e.event === 'warning_event');
    expect(entry).toBeDefined();
    expect(entry!.lvl).toBe('warn');
  });

  it('error entries have lvl=error', () => {
    log.error('TEST', 'error_event');
    const ring = getRing();
    const entry = ring.find((e) => e.event === 'error_event');
    expect(entry).toBeDefined();
    expect(entry!.lvl).toBe('error');
  });
});
