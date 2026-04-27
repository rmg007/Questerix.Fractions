import { describe, it, expect } from 'vitest';
import { benchmarkSortToZone } from '@/validators/benchmark';

describe('validator.benchmark.sortToZone', () => {
  const fn = benchmarkSortToZone.fn.bind(benchmarkSortToZone);

  it('returns correct for all correct placements', () => {
    const correct = { f1: 'zero' as const, f2: 'half' as const };
    const result = fn({ studentPlacements: { ...correct } }, { correctPlacements: correct });
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns partial for ≤25% errors', () => {
    const correct = { f1: 'zero' as const, f2: 'half' as const, f3: 'one' as const, f4: 'half' as const };
    const student = { ...correct, f1: 'half' as const }; // 1/4 = 25% wrong
    const result = fn({ studentPlacements: student }, { correctPlacements: correct });
    expect(result.outcome).toBe('partial');
  });

  it('returns incorrect for >25% errors', () => {
    const correct = { f1: 'zero' as const, f2: 'half' as const, f3: 'one' as const };
    const student = { f1: 'half' as const, f2: 'one' as const, f3: 'zero' as const };
    const result = fn({ studentPlacements: student }, { correctPlacements: correct });
    expect(result.outcome).toBe('incorrect');
  });

  it('handles empty placements gracefully', () => {
    const result = fn(
      { studentPlacements: {} },
      { correctPlacements: {} }
    );
    expect(result.outcome).toBe('correct');
  });
});
