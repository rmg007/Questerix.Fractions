import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startFrameTrace, stopFrameTrace, getFrameStats, resetFrameStats } from './traceFrame';

describe('traceFrame', () => {
  beforeEach(() => {
    resetFrameStats();
    vi.clearAllTimers();
  });

  afterEach(() => {
    stopFrameTrace();
  });

  it('should start and stop recording', () => {
    startFrameTrace();
    const stats = getFrameStats();
    expect(stats.count).toBeGreaterThanOrEqual(0);
    stopFrameTrace();
  });

  it('should record frame durations', () => {
    vi.useFakeTimers();

    startFrameTrace();

    // Simulate 5 frames
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(16); // ~60 fps
      vi.runAllTimersAsync();
    }

    const stats = getFrameStats();
    expect(stats.count).toBeGreaterThan(0);
    expect(stats.p50).toBeGreaterThan(0);
    expect(stats.p95).toBeGreaterThanOrEqual(stats.p50);
    expect(stats.mean).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('should calculate percentiles correctly', () => {
    vi.useFakeTimers();

    startFrameTrace();

    // Simulate 10 frames with fixed duration
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(15);
      vi.runAllTimersAsync();
    }

    const stats = getFrameStats();
    expect(stats.count).toBeGreaterThan(0);
    expect(stats.p50).toBeGreaterThan(0);
    expect(stats.p95).toBeGreaterThanOrEqual(stats.p50);

    vi.useRealTimers();
  });

  it('should respect buffer size limit', () => {
    vi.useFakeTimers();

    startFrameTrace();

    // Simulate 400 frames (buffer size is 300)
    for (let i = 0; i < 400; i++) {
      vi.advanceTimersByTime(16);
      vi.runAllTimersAsync();
    }

    const stats = getFrameStats();
    expect(stats.count).toBeLessThanOrEqual(300);

    vi.useRealTimers();
  });

  it('should return zero stats when not recording', () => {
    const stats = getFrameStats();
    expect(stats.p50).toBe(0);
    expect(stats.p95).toBe(0);
    expect(stats.count).toBe(0);
  });

  it('should reset stats', () => {
    vi.useFakeTimers();

    startFrameTrace();

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(16);
      vi.runAllTimersAsync();
    }

    let stats = getFrameStats();
    expect(stats.count).toBeGreaterThan(0);

    resetFrameStats();
    stats = getFrameStats();
    expect(stats.count).toBe(0);

    vi.useRealTimers();
  });
});
