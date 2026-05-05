import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  markInputEvent,
  getInputLatencyStats,
  getInputLatencyStatsByArchetype,
  resetInputLatencyStats,
  getRawInputLatencySamples,
} from './traceInput';

describe('traceInput', () => {
  beforeEach(() => {
    resetInputLatencyStats();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should mark input events', async () => {
    vi.useFakeTimers();

    const id = markInputEvent('partition');
    expect(id).toBeGreaterThanOrEqual(0);

    vi.advanceTimersByTime(20);
    await vi.runAllTimersAsync();

    const stats = getInputLatencyStats();
    expect(stats.count).toBeGreaterThan(0);
    expect(stats.p95).toBeGreaterThan(0);
  });

  it('should calculate latency from event to paint', async () => {
    vi.useFakeTimers();

    markInputEvent('partition');

    // Event happens at t=0, paint happens at t=20
    vi.advanceTimersByTime(20);
    await vi.runAllTimersAsync();

    const stats = getInputLatencyStats();
    expect(stats.p50).toBeGreaterThan(0);
    expect(stats.p50).toBeLessThanOrEqual(30); // Rough estimate
  });

  it('should filter by archetype', async () => {
    vi.useFakeTimers();

    markInputEvent('partition');
    vi.advanceTimersByTime(10);
    await vi.runAllTimersAsync();

    markInputEvent('snap_match');
    vi.advanceTimersByTime(15);
    await vi.runAllTimersAsync();

    const partitionStats = getInputLatencyStatsByArchetype('partition');
    const snapMatchStats = getInputLatencyStatsByArchetype('snap_match');

    expect(partitionStats.count).toBeGreaterThan(0);
    expect(snapMatchStats.count).toBeGreaterThan(0);
  });

  it('should return zero stats for missing archetype', () => {
    const stats = getInputLatencyStatsByArchetype('nonexistent');
    expect(stats.count).toBe(0);
    expect(stats.p50).toBe(0);
  });

  it('should reset samples', async () => {
    vi.useFakeTimers();

    markInputEvent();
    vi.advanceTimersByTime(10);
    await vi.runAllTimersAsync();

    let stats = getInputLatencyStats();
    expect(stats.count).toBeGreaterThan(0);

    resetInputLatencyStats();
    stats = getInputLatencyStats();
    expect(stats.count).toBe(0);
  });

  it('should return raw samples', async () => {
    vi.useFakeTimers();

    markInputEvent('partition');
    vi.advanceTimersByTime(15);
    await vi.runAllTimersAsync();

    const samples = getRawInputLatencySamples();
    expect(samples.length).toBeGreaterThan(0);
    expect(samples[0]).toHaveProperty('eventTime');
    expect(samples[0]).toHaveProperty('paintTime');
    expect(samples[0]).toHaveProperty('latency');
  });

  it('should handle multiple concurrent events', async () => {
    vi.useFakeTimers();

    markInputEvent('partition');
    markInputEvent('snap_match');

    vi.advanceTimersByTime(20);
    await vi.runAllTimersAsync();

    const stats = getInputLatencyStats();
    expect(stats.count).toBeGreaterThan(0);
  });
});
