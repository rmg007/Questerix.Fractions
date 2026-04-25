/**
 * Shared geometry helpers for all validators.
 * Pure functions — no DOM, no Phaser, no I/O.
 * per activity-archetypes.md §11
 */

export interface Point { x: number; y: number }

/** Clamp value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Manhattan distance between two points. */
export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Shoelace formula for polygon area (always positive).
 * per activity-archetypes.md §1 (equalAreas validator geometry)
 */
export function polygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += vertices[i]!.x * vertices[j]!.y;
    sum -= vertices[j]!.x * vertices[i]!.y;
  }
  return Math.abs(sum) / 2;
}

/** Returns true if |value - target| / target <= toleranceFraction. */
export function isWithinTolerance(
  value: number,
  target: number,
  toleranceFraction: number
): boolean {
  if (target === 0) return value === 0;
  return Math.abs(value - target) / target <= toleranceFraction;
}

/** Array mean. Returns 0 for empty arrays. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Kendall tau distance: minimum adjacent swaps to transform `a` into `b`.
 * Both arrays must contain the same elements (no dedup check for perf).
 * per activity-archetypes.md §7 (order.sequence)
 */
export function kendallTauDistance(a: string[], b: string[]): number {
  const pos = new Map<string, number>(b.map((v, i) => [v, i]));
  const ranked = a.map(v => pos.get(v) ?? 0);
  let swaps = 0;
  for (let i = 0; i < ranked.length; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      if ((ranked[i] ?? 0) > (ranked[j] ?? 0)) swaps++;
    }
  }
  return swaps;
}
