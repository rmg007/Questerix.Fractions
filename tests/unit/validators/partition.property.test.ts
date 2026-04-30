/**
 * Property tests for partition validator (C4b.1 — division by near-zero fix).
 * Fast-check ensures degenerate cases don't produce Infinity or NaN.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { partitionEqualAreas } from '@/validators/partition';

describe('partitionEqualAreas property tests', () => {
  it('should never return NaN or Infinity scores', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 1 }), { minLength: 1, maxLength: 5 }),
        fc.float({ min: 0, max: 0.5 }),
        (areas, tol) => {
          const result = partitionEqualAreas.fn(
            { regionAreas: areas },
            {
              targetPartitions: areas.length,
              areaTolerance: tol,
            }
          );
          expect(isFinite(result.score)).toBe(true);
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle degenerate case (all areas near-zero)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (count) => {
        const areas = Array(count).fill(1e-12);
        const result = partitionEqualAreas.fn(
          { regionAreas: areas },
          {
            targetPartitions: count,
            areaTolerance: 0.05,
          }
        );
        expect(result.outcome).toBe('incorrect');
        expect(result.score).toBe(0);
        expect(result.feedback).toBe('degenerate_partition');
      })
    );
  });

  it('should reject when partition count mismatches', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(0.1), max: Math.fround(1) }), {
          minLength: 2,
          maxLength: 5,
        }),
        (areas) => {
          const result = partitionEqualAreas.fn(
            { regionAreas: areas },
            {
              targetPartitions: areas.length + 1, // mismatch
              areaTolerance: 0.05,
            }
          );
          expect(result.outcome).toBe('incorrect');
          expect(result.score).toBe(0);
        }
      )
    );
  });

  it('should return correct when all areas equal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        // Explicit bounds + exclude NaN/Infinity/subnormals so fc never feeds
        // the validator a value that hits the avg ≤ 1e-9 degenerate guard.
        fc.float({
          min: Math.fround(0.5),
          max: Math.fround(5),
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (count, area) => {
          const areas = Array(count).fill(area);
          const result = partitionEqualAreas.fn(
            { regionAreas: areas },
            {
              targetPartitions: count,
              areaTolerance: 0.05,
            }
          );
          expect(result.outcome).toBe('correct');
          expect(result.score).toBe(1);
        }
      ),
      { numRuns: 50, seed: 42 } // stable seed — no flakiness from worker schedule
    );
  });

  it('score should monotonically increase as areas approach equality', () => {
    const testArea1 = [1.0, 1.0, 1.0];
    const testArea2 = [1.0, 1.0, 1.5];
    const testArea3 = [1.0, 1.0, 3.0];

    const res1 = partitionEqualAreas.fn(
      { regionAreas: testArea1 },
      { targetPartitions: 3, areaTolerance: 0.5 }
    );
    const res2 = partitionEqualAreas.fn(
      { regionAreas: testArea2 },
      { targetPartitions: 3, areaTolerance: 0.5 }
    );
    const res3 = partitionEqualAreas.fn(
      { regionAreas: testArea3 },
      { targetPartitions: 3, areaTolerance: 0.5 }
    );

    expect(res1.score).toBeGreaterThanOrEqual(res2.score);
    expect(res2.score).toBeGreaterThanOrEqual(res3.score);
  });
});
