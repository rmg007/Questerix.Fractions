/**
 * Unit tests for src/lib/a11y/liveRegion.ts
 *
 * Covers:
 * - initLiveRegions creates both polite and assertive regions
 * - initLiveRegions is idempotent (safe to call multiple times)
 * - announce creates the correct aria-live region in the DOM
 * - announce uses 'polite' vs 'assertive' correctly
 * - announce deduplicates identical messages within 1 s
 * - announce allows the same message after > 1 s
 * - announce with empty text is a no-op
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initLiveRegions, announce } from '@/lib/a11y/liveRegion';

const POLITE_ID = 'qf-live-polite';
const ASSERTIVE_ID = 'qf-live-assertive';

function cleanup(): void {
  document.getElementById(POLITE_ID)?.remove();
  document.getElementById(ASSERTIVE_ID)?.remove();
}

describe('initLiveRegions', () => {
  beforeEach(() => {
    cleanup();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('creates the polite aria-live region', () => {
    initLiveRegions();
    const el = document.getElementById(POLITE_ID);
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el?.getAttribute('aria-live')).toBe('polite');
    expect(el?.getAttribute('aria-atomic')).toBe('true');
    expect(el?.getAttribute('role')).toBe('status');
  });

  it('creates the assertive aria-live region', () => {
    initLiveRegions();
    const el = document.getElementById(ASSERTIVE_ID);
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el?.getAttribute('aria-live')).toBe('assertive');
    expect(el?.getAttribute('aria-atomic')).toBe('true');
    expect(el?.getAttribute('role')).toBe('alert');
  });

  it('is idempotent — calling twice does not create duplicate elements', () => {
    initLiveRegions();
    initLiveRegions();
    const politeEls = document.querySelectorAll(`#${POLITE_ID}`);
    const assertiveEls = document.querySelectorAll(`#${ASSERTIVE_ID}`);
    expect(politeEls.length).toBe(1);
    expect(assertiveEls.length).toBe(1);
  });
});

describe('announce', () => {
  beforeEach(() => {
    cleanup();
    // Stub rAF to fire synchronously so textContent updates are testable inline.
    // Use stubGlobal only — do NOT use vi.useFakeTimers() here, because fake
    // timers take over requestAnimationFrame and break the synchronous stub.
    // Time-sensitive tests use vi.spyOn(Date, 'now') individually instead.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('creates a polite aria-live region in the DOM', () => {
    announce('Correct!', 'polite');
    const el = document.getElementById(POLITE_ID);
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el?.getAttribute('aria-live')).toBe('polite');
  });

  it('creates an assertive aria-live region in the DOM', () => {
    announce('Try again!', 'assertive');
    const el = document.getElementById(ASSERTIVE_ID);
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el?.getAttribute('aria-live')).toBe('assertive');
  });

  it('writes text to the polite region', () => {
    announce('Great job!', 'polite');
    const el = document.getElementById(POLITE_ID);
    expect(el?.textContent).toBe('Great job!');
  });

  it('writes text to the assertive region', () => {
    announce('Not quite!', 'assertive');
    const el = document.getElementById(ASSERTIVE_ID);
    expect(el?.textContent).toBe('Not quite!');
  });

  it('deduplicates identical messages within 1 s on the same channel', () => {
    initLiveRegions();
    const el = document.getElementById(POLITE_ID)!;

    // Use Date.now spy so both calls get the SAME timestamp → deduplication fires
    const fixedNow = 5_000_000; // large enough to not collide with previous tests
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    announce('dedupe-test-msg', 'polite');
    expect(el.textContent).toBe('dedupe-test-msg');

    // Clear to detect whether the second call writes
    el.textContent = 'cleared';
    announce('dedupe-test-msg', 'polite'); // same message, same timestamp → drop

    // The second announcement should be dropped; text stays 'cleared'
    expect(el.textContent).toBe('cleared');
    dateSpy.mockRestore();
  });

  it('allows the same message after > 1 s', () => {
    initLiveRegions();
    const el = document.getElementById(POLITE_ID)!;

    let fakeNow = 10_000_000; // large enough to not collide with previous tests
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

    announce('after-1s-test-msg', 'polite');
    expect(el.textContent).toBe('after-1s-test-msg');

    // Advance the mocked clock past the deduplication window
    fakeNow += 1001;
    dateSpy.mockReturnValue(fakeNow);

    el.textContent = 'cleared';
    announce('after-1s-test-msg', 'polite'); // same message, > 1 s later → should fire
    expect(el.textContent).toBe('after-1s-test-msg');

    dateSpy.mockRestore();
  });

  it('does not deduplicate across different urgency channels', () => {
    initLiveRegions();

    announce('Same text', 'polite');
    announce('Same text', 'assertive'); // different channel — should NOT be suppressed

    expect(document.getElementById(POLITE_ID)?.textContent).toBe('Same text');
    expect(document.getElementById(ASSERTIVE_ID)?.textContent).toBe('Same text');
  });

  it('is a no-op for empty text', () => {
    initLiveRegions();
    const elBefore = document.getElementById(POLITE_ID)?.textContent;
    expect(() => announce('', 'polite')).not.toThrow();
    // textContent should not have changed to empty string via this call
    expect(document.getElementById(POLITE_ID)?.textContent).toBe(elBefore);
  });
});
