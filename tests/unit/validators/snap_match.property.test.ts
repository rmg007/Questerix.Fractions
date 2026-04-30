/**
 * Property tests for snap_match validator (C4b.3 — canonical sorting fix).
 * Fast-check ensures order-insensitivity and deterministic pair lookup.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { snapMatchAllPairs } from '@/validators/snap_match';

describe('snapMatchAllPairs property tests', () => {
  it('should accept pairs in any order within the pair', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 1, maxLength: 5 }),
        (pairs) => {
          // Shuffle each pair (canonical sort should normalize)
          const shuffledPairs = pairs.map(([a, b]) =>
            Math.random() > 0.5 ? [a, b] : [b, a]
          ) as Array<[string, string]>;

          const result = snapMatchAllPairs.fn(
            { studentPairs: shuffledPairs },
            { expectedPairs: pairs }
          );
          // All pairs should match regardless of order within pair
          expect(result.outcome).toBe('correct');
          expect(result.score).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject when pair count mismatches', () => {
    const result = snapMatchAllPairs.fn(
      { studentPairs: [['a', 'b']] },
      {
        expectedPairs: [
          ['a', 'b'],
          ['c', 'd'],
        ],
      }
    );
    expect(result.outcome).toBe('incorrect');
    expect(result.score).toBe(0);
    expect(result.feedback).toBe('incomplete');
  });

  it('should reject when a pair is completely wrong', () => {
    const result = snapMatchAllPairs.fn(
      { studentPairs: [['x', 'y']] },
      { expectedPairs: [['a', 'b']] }
    );
    expect(result.outcome).toBe('incorrect');
    expect(result.score).toBe(0);
  });

  it('should handle canonical sorting consistently', () => {
    // Test that both [a,b] and [b,a] student pairs match [a,b] expected
    const result1 = snapMatchAllPairs.fn(
      { studentPairs: [['a', 'b']] },
      { expectedPairs: [['a', 'b']] }
    );
    const result2 = snapMatchAllPairs.fn(
      { studentPairs: [['b', 'a']] },
      { expectedPairs: [['a', 'b']] }
    );
    expect(result1.outcome).toBe('correct');
    expect(result2.outcome).toBe('correct');
  });

  it('should handle multiple pairs with various orderings', () => {
    const expected = [
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
    ];
    // Student pairs in different orderings
    const student = [
      ['b', 'a'], // reversed
      ['c', 'd'], // normal
      ['f', 'e'], // reversed
    ];
    const result = snapMatchAllPairs.fn(
      { studentPairs: student as any },
      { expectedPairs: expected as any }
    );
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('should be deterministic across runs', () => {
    const expected = [['frog', 'animal']] as any;
    const student = [['animal', 'frog']] as any;

    const results = Array.from({ length: 10 }, () =>
      snapMatchAllPairs.fn({ studentPairs: student }, { expectedPairs: expected })
    );

    // All runs should produce identical results
    const firstOutcome = results[0].outcome;
    expect(results.every((r) => r.outcome === firstOutcome)).toBe(true);
  });
});
