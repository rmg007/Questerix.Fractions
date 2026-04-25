import { describe, it, expect } from 'vitest';
import { partitionEqualAreas, partitionEqualCount } from '@/validators/partition';

describe('validator.partition.equalAreas', () => {
  const fn = partitionEqualAreas.fn.bind(partitionEqualAreas);
  const expected = { targetPartitions: 2, areaTolerance: 0.05 };

  it('returns correct for equal halves', () => {
    const result = fn({ regionAreas: [50, 50] }, expected);
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns partial for close-but-not-exact areas', () => {
    // areaTolerance=0.05, delta=4, mean=50, relativeDelta=0.08 → between 0.05 and 0.10 → partial
    const result = fn({ regionAreas: [48, 52] }, expected);
    expect(result.outcome).toBe('partial');
  });

  it('returns incorrect for clearly unequal areas', () => {
    const result = fn({ regionAreas: [30, 70] }, expected);
    expect(result.outcome).toBe('incorrect');
  });

  it('returns incorrect for wrong partition count', () => {
    const result = fn({ regionAreas: [33, 33, 34] }, expected);
    expect(result.outcome).toBe('incorrect');
    expect(result.feedback).toBe('wrong_partition_count');
  });

  it('handles thirds with tolerance', () => {
    const exp3 = { targetPartitions: 3, areaTolerance: 0.05 };
    const result = fn({ regionAreas: [33, 33, 34] }, exp3);
    // delta 1, mean ~33.3, relative ~0.03 ≤ 0.05 → correct
    expect(result.outcome).toBe('correct');
  });
});

describe('validator.partition.equalCount', () => {
  const fn = partitionEqualCount.fn.bind(partitionEqualCount);

  it('returns correct when count matches', () => {
    expect(fn({ regionCount: 4 }, { targetPartitions: 4 }).outcome).toBe('correct');
  });

  it('returns incorrect when count mismatches', () => {
    expect(fn({ regionCount: 3 }, { targetPartitions: 4 }).outcome).toBe('incorrect');
  });
});
