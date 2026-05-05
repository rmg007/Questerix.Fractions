/**
 * Input latency instrumentation.
 * Measures pointer-to-paint latency by pairing pointermove events with the next animation frame.
 * Tree-shaken out of production builds via import.meta.env.DEV guard.
 */

const LATENCY_BUFFER_SIZE = 100;

interface InputLatencySample {
  eventTime: number;
  paintTime: number;
  latency: number;
  archetype: string | undefined;
}

interface InputLatencyStats {
  p50: number;
  p95: number;
  mean: number;
  max: number;
  count: number;
}

let latencySamples: InputLatencySample[] = [];
const pendingEvents: Map<number, { eventTime: number; archetype: string | undefined }> = new Map();
let eventId = 0;

/**
 * Mark a pointer event for latency measurement.
 * Call this from within a pointermove handler.
 */
export function markInputEvent(archetype?: string): number {
  if (!import.meta.env.DEV) return -1;

  const id = eventId++;
  const eventTime = performance.now();

  pendingEvents.set(id, { eventTime, archetype: archetype ?? undefined });

  // Schedule paint time measurement on the next animation frame
  requestAnimationFrame(() => {
    const paintTime = performance.now();
    const pending = pendingEvents.get(id);

    if (pending) {
      const latency = paintTime - pending.eventTime;
      const sample: InputLatencySample = {
        eventTime: pending.eventTime,
        paintTime,
        latency,
        archetype: pending.archetype,
      };

      latencySamples.push(sample);
      if (latencySamples.length > LATENCY_BUFFER_SIZE) {
        latencySamples.shift();
      }

      pendingEvents.delete(id);
    }
  });

  return id;
}

/**
 * Get input latency statistics.
 */
export function getInputLatencyStats(): InputLatencyStats {
  if (!import.meta.env.DEV || latencySamples.length === 0) {
    return { p50: 0, p95: 0, mean: 0, max: 0, count: 0 };
  }

  const latencies = latencySamples.map((s) => s.latency).sort((a, b) => a - b);
  const count = latencies.length;
  const max = latencies[count - 1] ?? 0;
  const mean = latencies.reduce((a, b) => a + b, 0) / count;

  const p50Index = Math.floor(count * 0.5);
  const p95Index = Math.floor(count * 0.95);

  return {
    p50: latencies[p50Index] ?? 0,
    p95: latencies[p95Index] ?? 0,
    mean,
    max,
    count,
  };
}

/**
 * Get input latency stats filtered by archetype.
 */
export function getInputLatencyStatsByArchetype(archetype: string): InputLatencyStats {
  if (!import.meta.env.DEV) {
    return { p50: 0, p95: 0, mean: 0, max: 0, count: 0 };
  }

  const filtered = latencySamples
    .filter((s) => s.archetype === archetype)
    .map((s) => s.latency)
    .sort((a, b) => a - b);

  if (filtered.length === 0) {
    return { p50: 0, p95: 0, mean: 0, max: 0, count: 0 };
  }

  const count = filtered.length;
  const max = filtered[count - 1] ?? 0;
  const mean = filtered.reduce((a, b) => a + b, 0) / count;

  const p50Index = Math.floor(count * 0.5);
  const p95Index = Math.floor(count * 0.95);

  return {
    p50: filtered[p50Index] ?? 0,
    p95: filtered[p95Index] ?? 0,
    mean,
    max,
    count,
  };
}

/**
 * Reset input latency buffer.
 */
export function resetInputLatencyStats(): void {
  if (!import.meta.env.DEV) return;
  latencySamples = [];
  pendingEvents.clear();
}

/**
 * Get raw samples for external analysis.
 */
export function getRawInputLatencySamples(): InputLatencySample[] {
  if (!import.meta.env.DEV) return [];
  return [...latencySamples];
}
