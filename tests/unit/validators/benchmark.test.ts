import { describe, it, expect } from 'vitest';
import { benchmarkSortToZone } from '@/validators/benchmark';

describe('validator.benchmark.sortToZone', () => {
  const fn = benchmarkSortToZone.fn.bind(benchmarkSortToZone);

  it('returns correct for all correct placements', () => {
    const correct = new Map([
      ['f1', 'zero' as const],
      ['f2', 'half' as const],
    ]);
    const result = fn({ studentPlacements: new Map(correct) }, { correctPlacements: correct });
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns partial for ≤25% errors', () => {
    const correct = new Map<string, 'zero' | 'half' | 'one'>([
      ['f1', 'zero'],
      ['f2', 'half'],
      ['f3', 'one'],
      ['f4', 'half'],
    ]);
    const student = new Map(correct);
    student.set('f1', 'half'); // 1/4 = 25% wrong
    const result = fn({ studentPlacements: student }, { correctPlacements: correct });
    expect(result.outcome).toBe('partial');
  });

  it('returns incorrect for >25% errors', () => {
    const correct = new Map<string, 'zero' | 'half' | 'one'>([
      ['f1', 'zero'],
      ['f2', 'half'],
      ['f3', 'one'],
    ]);
    const student = new Map<string, 'zero' | 'half' | 'one'>([
      ['f1', 'half'],
      ['f2', 'one'],
      ['f3', 'zero'],
    ]);
    const result = fn({ studentPlacements: student }, { correctPlacements: correct });
    expect(result.outcome).toBe('incorrect');
  });

  it('handles empty placements gracefully', () => {
    const result = fn({ studentPlacements: new Map() }, { correctPlacements: new Map() });
    expect(result.outcome).toBe('correct');
  });
});
