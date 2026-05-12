/**
 * Heap memory instrumentation.
 * Samples usedJSHeapSize on scene transitions (Chromium only).
 * Tree-shaken out of production builds via import.meta.env.DEV guard.
 */

interface HeapSample {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  sceneKey: string | undefined;
}

/**
 * Performance.memory API (Chromium-specific).
 * Not part of standard Performance interface, hence custom typing.
 */
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Type guard: check if performance.memory API is available and valid.
 */
function hasMemoryAPI(perf: Performance): perf is Performance & { memory: PerformanceMemory } {
  if (typeof perf !== 'object' || !perf) return false;
  const mem = (perf as unknown as Record<string, unknown>).memory;
  if (typeof mem !== 'object' || !mem) return false;

  const m = mem as Record<string, unknown>;
  return (
    typeof m.usedJSHeapSize === 'number' &&
    Number.isFinite(m.usedJSHeapSize) &&
    typeof m.totalJSHeapSize === 'number' &&
    Number.isFinite(m.totalJSHeapSize) &&
    typeof m.jsHeapSizeLimit === 'number' &&
    Number.isFinite(m.jsHeapSizeLimit)
  );
}

interface HeapDeltaStats {
  startHeap: number;
  endHeap: number;
  delta: number;
  peakHeap: number;
  samples: number;
}

let heapSamples: HeapSample[] = [];

/**
 * Record a heap sample (typically on scene transition).
 * Call from scene shutdown or lifecycle event.
 */
export function recordHeapSample(sceneKey?: string): void {
  if (!import.meta.env.DEV) return;

  // Only available in Chromium — validate shape before use
  if (
    typeof window !== 'undefined' &&
    typeof window.performance === 'object' &&
    hasMemoryAPI(window.performance)
  ) {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = window.performance.memory;

    const sample: HeapSample = {
      timestamp: performance.now(),
      usedJSHeapSize: usedJSHeapSize || 0,
      totalJSHeapSize: totalJSHeapSize || 0,
      jsHeapSizeLimit: jsHeapSizeLimit || 0,
      sceneKey: sceneKey ?? undefined,
    };

    heapSamples.push(sample);
  }
}

/**
 * Get heap delta statistics between first and last sample.
 */
export function getHeapDeltaStats(): HeapDeltaStats {
  if (!import.meta.env.DEV || heapSamples.length < 2) {
    return {
      startHeap: 0,
      endHeap: 0,
      delta: 0,
      peakHeap: 0,
      samples: heapSamples.length,
    };
  }

  const firstSample = heapSamples[0];
  const lastSample = heapSamples[heapSamples.length - 1];
  const startHeap = firstSample?.usedJSHeapSize ?? 0;
  const endHeap = lastSample?.usedJSHeapSize ?? 0;
  const peakHeap = Math.max(...heapSamples.map((s) => s.usedJSHeapSize));
  const delta = endHeap - startHeap;

  return {
    startHeap,
    endHeap,
    delta,
    peakHeap,
    samples: heapSamples.length,
  };
}

/**
 * Get heap delta within a specific scene key range.
 */
export function getHeapDeltaByScene(sceneKey: string): HeapDeltaStats {
  if (!import.meta.env.DEV) {
    return {
      startHeap: 0,
      endHeap: 0,
      delta: 0,
      peakHeap: 0,
      samples: 0,
    };
  }

  const filtered = heapSamples.filter((s) => s.sceneKey === sceneKey);

  if (filtered.length < 2) {
    return {
      startHeap: 0,
      endHeap: 0,
      delta: 0,
      peakHeap: 0,
      samples: filtered.length,
    };
  }

  const firstSample = filtered[0];
  const lastSample = filtered[filtered.length - 1];
  const startHeap = firstSample?.usedJSHeapSize ?? 0;
  const endHeap = lastSample?.usedJSHeapSize ?? 0;
  const peakHeap = Math.max(...filtered.map((s) => s.usedJSHeapSize));
  const delta = endHeap - startHeap;

  return {
    startHeap,
    endHeap,
    delta,
    peakHeap,
    samples: filtered.length,
  };
}

/**
 * Reset heap samples.
 */
export function resetHeapStats(): void {
  if (!import.meta.env.DEV) return;
  heapSamples = [];
}

/**
 * Get raw heap samples for external analysis.
 */
export function getRawHeapSamples(): HeapSample[] {
  if (!import.meta.env.DEV) return [];
  return [...heapSamples];
}

/**
 * Convert heap size in bytes to MB for readability.
 */
export function formatHeapBytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
