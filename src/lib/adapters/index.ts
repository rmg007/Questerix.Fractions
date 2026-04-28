/**
 * Production adapters for engine port interfaces (src/engine/ports.ts).
 * Injected at the composition root (src/main.ts).
 * Test doubles are inlined per-test; do not export them from here.
 */

import type { Clock, IdGenerator, Rng, EngineLogger, Viewport } from '@/engine/ports';

// ── SystemClock ───────────────────────────────────────────────────────────

export const SystemClock: Clock = {
  now: () => Date.now(),
  monotonic: () => performance.now(),
};

// ── CryptoUuidGenerator ───────────────────────────────────────────────────

export const CryptoUuidGenerator: IdGenerator = {
  generate: () => crypto.randomUUID(),
};

// ── MathRandomRng ─────────────────────────────────────────────────────────

export const MathRandomRng: Rng = {
  random: () => Math.random(),
};

// ── ConsoleEngineLogger ───────────────────────────────────────────────────

export const ConsoleEngineLogger: EngineLogger = {
  debug: (event, attrs) => console.debug(`[engine] ${event}`, attrs ?? {}),
  info: (event, attrs) => console.info(`[engine] ${event}`, attrs ?? {}),
  warn: (event, attrs) => console.warn(`[engine] ${event}`, attrs ?? {}),
  error: (event, attrs) => console.error(`[engine] ${event}`, attrs ?? {}),
};

// ── BrowserViewport ───────────────────────────────────────────────────────

export const BrowserViewport: Viewport = {
  get width() {
    return window.innerWidth;
  },
  get height() {
    return window.innerHeight;
  },
  get devicePixelRatio() {
    return window.devicePixelRatio ?? 1;
  },
};
