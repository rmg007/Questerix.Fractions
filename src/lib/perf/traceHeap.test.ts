import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordHeapSample,
  getHeapDeltaStats,
  getHeapDeltaByScene,
  resetHeapStats,
  getRawHeapSamples,
  formatHeapBytes,
} from './traceHeap';

describe('traceHeap', () => {
  beforeEach(() => {
    resetHeapStats();

    // Mock performance.memory for Chromium
    if (!('memory' in window.performance)) {
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024, // 10 MB
          totalJSHeapSize: 20 * 1024 * 1024,
          jsHeapSizeLimit: 100 * 1024 * 1024,
        },
        configurable: true,
      });
    }
  });

  afterEach(() => {
    resetHeapStats();
  });

  it('should record heap samples', () => {
    recordHeapSample('MenuScene');
    const samples = getRawHeapSamples();
    expect(samples.length).toBe(1);
    expect(samples[0]?.sceneKey).toBe('MenuScene');
  });

  it('should calculate heap delta', () => {
    recordHeapSample('MenuScene');

    // Simulate heap growth
    const memory = (window.performance as any).memory;
    memory.usedJSHeapSize = 15 * 1024 * 1024; // 15 MB
    recordHeapSample('MenuScene');

    const stats = getHeapDeltaStats();
    expect(stats.samples).toBe(2);
    expect(stats.delta).toBeGreaterThan(0);
  });

  it('should track peak heap', () => {
    recordHeapSample('MenuScene');

    const memory = (window.performance as any).memory;
    memory.usedJSHeapSize = 25 * 1024 * 1024; // 25 MB (peak)
    recordHeapSample('MenuScene');

    memory.usedJSHeapSize = 20 * 1024 * 1024; // Back down to 20 MB
    recordHeapSample('MenuScene');

    const stats = getHeapDeltaStats();
    expect(stats.peakHeap).toBeGreaterThanOrEqual(25 * 1024 * 1024);
  });

  it('should filter by scene key', () => {
    recordHeapSample('MenuScene');
    const memory = (window.performance as any).memory;

    memory.usedJSHeapSize = 15 * 1024 * 1024;
    recordHeapSample('LevelScene');

    memory.usedJSHeapSize = 20 * 1024 * 1024;
    recordHeapSample('MenuScene');

    const menuStats = getHeapDeltaByScene('MenuScene');
    const levelStats = getHeapDeltaByScene('LevelScene');

    expect(menuStats.samples).toBe(2);
    expect(levelStats.samples).toBe(1);
  });

  it('should return zero stats when not enough samples', () => {
    recordHeapSample('MenuScene');
    const stats = getHeapDeltaStats();
    expect(stats.delta).toBe(0);
    expect(stats.samples).toBe(1);
  });

  it('should reset samples', () => {
    recordHeapSample('MenuScene');
    let samples = getRawHeapSamples();
    expect(samples.length).toBe(1);

    resetHeapStats();
    samples = getRawHeapSamples();
    expect(samples.length).toBe(0);
  });

  it('should format heap bytes correctly', () => {
    const formatted = formatHeapBytes(10 * 1024 * 1024);
    expect(formatted).toBe('10.00 MB');
  });

  it('should handle missing memory API gracefully', () => {
    delete (window.performance as any).memory;
    recordHeapSample('MenuScene');
    const samples = getRawHeapSamples();
    // Should not crash, samples may be empty depending on implementation
    expect(Array.isArray(samples)).toBe(true);
  });
});
