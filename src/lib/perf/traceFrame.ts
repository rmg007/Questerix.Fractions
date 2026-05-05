/**
 * Frame timing instrumentation.
 * Records per-frame duration into a ring buffer; tree-shaken out of production builds via import.meta.env.DEV guard.
 */

const FRAME_BUFFER_SIZE = 300; // ~5 seconds at 60 fps

interface FrameStats {
  p50: number;
  p95: number;
  mean: number;
  max: number;
  count: number;
}

let frameTimestamps: number[] = [];
let lastFrameTime = 0;
let rafHandle: number | null = null;
let isRecording = false;

/**
 * Start recording frame timings. Call once at scene start.
 */
export function startFrameTrace(): void {
  if (!import.meta.env.DEV) return;

  frameTimestamps = [];
  lastFrameTime = performance.now();
  isRecording = true;

  const tick = () => {
    if (!isRecording) return;

    const now = performance.now();
    const frameDuration = now - lastFrameTime;
    lastFrameTime = now;

    frameTimestamps.push(frameDuration);
    if (frameTimestamps.length > FRAME_BUFFER_SIZE) {
      frameTimestamps.shift();
    }

    rafHandle = requestAnimationFrame(tick);
  };

  rafHandle = requestAnimationFrame(tick);
}

/**
 * Stop recording frame timings.
 */
export function stopFrameTrace(): void {
  if (!import.meta.env.DEV) return;

  isRecording = false;
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }
}

/**
 * Get frame statistics from the current buffer.
 */
export function getFrameStats(): FrameStats {
  if (!import.meta.env.DEV || frameTimestamps.length === 0) {
    return { p50: 0, p95: 0, mean: 0, max: 0, count: 0 };
  }

  const sorted = [...frameTimestamps].sort((a, b) => a - b);
  const count = sorted.length;
  const max = sorted[count - 1] ?? 0;
  const mean = sorted.reduce((a, b) => a + b, 0) / count;

  const p50Index = Math.floor(count * 0.5);
  const p95Index = Math.floor(count * 0.95);

  return {
    p50: sorted[p50Index] ?? 0,
    p95: sorted[p95Index] ?? 0,
    mean,
    max,
    count,
  };
}

/**
 * Reset the buffer without stopping the trace.
 */
export function resetFrameStats(): void {
  if (!import.meta.env.DEV) return;
  frameTimestamps = [];
}
