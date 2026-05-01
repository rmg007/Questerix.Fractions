/**
 * Unit tests for src/validators/utils.ts
 * Pure geometry helpers — no DOM, no Phaser, no I/O.
 * per activity-archetypes.md §11
 */

import { describe, it, expect } from 'vitest';
import { lerp, manhattanDistance, polygonArea } from '@/validators/utils';
import type { Point } from '@/validators/utils';

// ── lerp ──────────────────────────────────────────────────────────────────────

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('midpoint works with negative bounds', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });

  it('clamps t < 0 to t=0 — returns a', () => {
    expect(lerp(5, 15, -2)).toBe(5);
  });

  it('clamps t > 1 to t=1 — returns b', () => {
    expect(lerp(5, 15, 3)).toBe(15);
  });

  it('works with equal a and b (degenerate range)', () => {
    expect(lerp(7, 7, 0.5)).toBe(7);
  });

  it('returns a value in [a, b] for t in [0, 1]', () => {
    const result = lerp(0, 1, 0.3);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ── manhattanDistance ─────────────────────────────────────────────────────────

describe('manhattanDistance', () => {
  it('returns 0 for identical points', () => {
    const p: Point = { x: 3, y: 7 };
    expect(manhattanDistance(p, p)).toBe(0);
  });

  it('returns 0 for two points at the origin', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });

  it('returns correct distance for positive coordinates', () => {
    // |5-1| + |8-3| = 4 + 5 = 9
    expect(manhattanDistance({ x: 1, y: 3 }, { x: 5, y: 8 })).toBe(9);
  });

  it('returns correct distance for negative coordinates', () => {
    // |-3-(-7)| + |2-6| = 4 + 4 = 8
    expect(manhattanDistance({ x: -7, y: 6 }, { x: -3, y: 2 })).toBe(8);
  });

  it('is symmetric', () => {
    const a: Point = { x: 2, y: 5 };
    const b: Point = { x: -1, y: 9 };
    expect(manhattanDistance(a, b)).toBe(manhattanDistance(b, a));
  });

  it('handles mixed positive/negative coordinates', () => {
    // |3-(-2)| + |(-4)-1| = 5 + 5 = 10
    expect(manhattanDistance({ x: -2, y: 1 }, { x: 3, y: -4 })).toBe(10);
  });
});

// ── polygonArea ───────────────────────────────────────────────────────────────

describe('polygonArea', () => {
  it('returns 0 for empty polygon', () => {
    expect(polygonArea([])).toBe(0);
  });

  it('returns 0 for a single point', () => {
    expect(polygonArea([{ x: 1, y: 1 }])).toBe(0);
  });

  it('returns 0 for two points (line)', () => {
    expect(polygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });

  it('returns correct area for a right triangle', () => {
    // Vertices: (0,0), (4,0), (0,3) → area = (4*3)/2 = 6
    const triangle: Point[] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }];
    expect(polygonArea(triangle)).toBeCloseTo(6);
  });

  it('returns correct area for a unit square', () => {
    const square: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(polygonArea(square)).toBeCloseTo(1);
  });

  it('returns correct area for a 2x3 rectangle', () => {
    const rect: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 2 },
      { x: 0, y: 2 },
    ];
    expect(polygonArea(rect)).toBeCloseTo(6);
  });

  it('returns 0 for collinear (degenerate) points', () => {
    // Three points on the same line → area = 0
    const collinear: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(polygonArea(collinear)).toBeCloseTo(0);
  });

  it('area is always non-negative regardless of winding order', () => {
    // Clockwise winding
    const cw: Point[] = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
    // Counter-clockwise winding
    const ccw: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    expect(polygonArea(cw)).toBeGreaterThanOrEqual(0);
    expect(polygonArea(ccw)).toBeGreaterThanOrEqual(0);
    expect(polygonArea(cw)).toBeCloseTo(polygonArea(ccw));
  });
});
