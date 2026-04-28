/**
 * Engine port interfaces — dependency inversion boundary for the domain layer.
 *
 * All engine modules (bkt, router, selection, calibration, misconceptionDetectors)
 * must depend only on these interfaces, never on host globals (Date, crypto,
 * Math.random, console, window, localStorage, fetch).
 *
 * Concrete adapters live in src/lib/adapters/; test doubles are inline per-test.
 * Injected at the composition root (src/main.ts) and threaded via scene data registry.
 */

// ── Clock ─────────────────────────────────────────────────────────────────

/**
 * Monotonic or wall-clock time source.
 * Use `performance.now()` for response-time deltas; `Date.now()` for timestamps
 * stored in domain objects. The interface unifies both so tests can use a fixed clock.
 */
export interface Clock {
  /** Returns current wall-clock time in milliseconds (epoch). Mirrors Date.now(). */
  now(): number;
  /** Returns monotonic time in milliseconds. Mirrors performance.now(). */
  monotonic(): number;
}

// ── IdGenerator ───────────────────────────────────────────────────────────

/**
 * Opaque unique ID factory.
 * Production adapter wraps crypto.randomUUID(); test adapter returns sequential IDs.
 */
export interface IdGenerator {
  /** Returns a new unique string ID (UUID v4 form). */
  generate(): string;
}

// ── Rng ───────────────────────────────────────────────────────────────────

/**
 * Seeded pseudo-random number generator.
 * Production adapter wraps Math.random(); test adapter accepts a seed for determinism.
 */
export interface Rng {
  /** Returns a float in [0, 1). Mirrors Math.random(). */
  random(): number;
}

// ── Logger ────────────────────────────────────────────────────────────────

/**
 * Structured logger interface for the engine layer.
 * Engine modules must never call console.* directly — use this interface instead.
 * Production adapter routes to src/lib/log.ts sinks.
 */
export interface EngineLogger {
  debug(event: string, attrs?: Record<string, unknown>): void;
  info(event: string, attrs?: Record<string, unknown>): void;
  warn(event: string, attrs?: Record<string, unknown>): void;
  error(event: string, attrs?: Record<string, unknown>): void;
}

// ── Viewport ──────────────────────────────────────────────────────────────

/**
 * Read-only viewport dimensions.
 * Allows engine modules to make layout-aware decisions without importing Phaser.
 */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

// ── DetectorContext ────────────────────────────────────────────────────────

/**
 * Aggregate context passed to every misconception detector.
 * Replaces direct host-global access in misconceptionDetectors.ts.
 */
export interface DetectorContext {
  clock: Clock;
  ids: IdGenerator;
  logger: EngineLogger;
}
