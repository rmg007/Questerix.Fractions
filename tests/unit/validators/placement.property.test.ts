/**
 * Property tests for placement validator (C4b.4 — negative scores fix).
 * Fast-check ensures Math.max(0, ...) prevents negative scores.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { placementSnapTolerance } from '@/validators/placement';

describe('placementSnapTolerance property tests', () => {
  it('should never return negative scores', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(10) }),
        fc.float({ min: Math.fround(0), max: Math.fround(10) }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(2) }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(3) }),
        (target, student, exactTol, closeTol) => {
          const result = placementSnapTolerance.fn(
            { studentPlacedDecimal: student },
            {
              targetDecimal: target,
              exactTolerance: exactTol,
              closeTolerance: closeTol,
            }
          );
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 1.0 when error is within exactTolerance', () => {
    const result = placementSnapTolerance.fn(
      { studentPlacedDecimal: 0.5 },
      {
        targetDecimal: 0.5,
        exactTolerance: 0.05,
        closeTolerance: 0.15,
      }
    );
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('should return partial score within closeTolerance', () => {
    const result = placementSnapTolerance.fn(
      { studentPlacedDecimal: 0.5 },
      {
        targetDecimal: 0.6, // error = 0.1
        exactTolerance: 0.05,
        closeTolerance: 0.15,
      }
    );
    expect(result.outcome).toBe('partial');
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it('should clamp partial score to [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.3) }),
        (target, student, tol) => {
          const result = placementSnapTolerance.fn(
            { studentPlacedDecimal: student },
            {
              targetDecimal: target,
              exactTolerance: tol * 0.5,
              closeTolerance: tol,
            }
          );
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect MC-PRX-02 misconception', () => {
    // Target > 0.5, student places < 0.5
    const result = placementSnapTolerance.fn(
      { studentPlacedDecimal: 0.3 },
      {
        targetDecimal: 0.7,
        exactTolerance: 0.05,
        closeTolerance: 0.15,
      }
    );
    expect(result.outcome).toBe('incorrect');
    expect(result.score).toBe(0);
    expect(result.detectedMisconception).toBe('MC-PRX-02');
  });

  it('should not flag MC-PRX-02 when target < 0.5', () => {
    const result = placementSnapTolerance.fn(
      { studentPlacedDecimal: 0.3 },
      {
        targetDecimal: 0.4, // target < 0.5, so no MC-PRX-02
        exactTolerance: 0.05,
        closeTolerance: 0.15,
      }
    );
    expect(result.detectedMisconception).toBeUndefined();
  });

  it('should not flag MC-PRX-02 when student >= 0.5', () => {
    const result = placementSnapTolerance.fn(
      { studentPlacedDecimal: 0.6 },
      {
        targetDecimal: 0.7, // target > 0.5, but student >= 0.5, so no MC-PRX-02
        exactTolerance: 0.05,
        closeTolerance: 0.15,
      }
    );
    expect(result.detectedMisconception).toBeUndefined();
  });
});
