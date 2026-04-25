import { describe, it, expect } from 'vitest';
import { makeFoldAndShade, makeHalvingByLine } from '@/validators/make';

describe('validator.make.foldAndShade', () => {
  const fn = makeFoldAndShade.fn.bind(makeFoldAndShade);
  const expected = { targetPartitions: 2, areaTolerance: 0.05, targetNumerator: 1 };

  it('returns correct for equal halves + correct shade count', () => {
    const result = fn({ regionAreas: [50, 50], shadedRegionCount: 1 }, expected);
    expect(result.outcome).toBe('correct');
  });

  it('returns incorrect when partition is wrong', () => {
    const result = fn({ regionAreas: [30, 70], shadedRegionCount: 1 }, expected);
    expect(result.outcome).toBe('incorrect');
  });

  it('returns incorrect for wrong shade count', () => {
    const result = fn({ regionAreas: [50, 50], shadedRegionCount: 2 }, expected);
    expect(result.outcome).toBe('incorrect');
    expect(result.feedback).toBe('wrong_shade_count');
  });
});

describe('validator.make.halvingByLine', () => {
  const fn = makeHalvingByLine.fn.bind(makeHalvingByLine);

  it('returns correct for equal halves', () => {
    expect(fn({ regionAreas: [50, 50] }, { areaTolerance: 0.05 }).outcome).toBe('correct');
  });

  it('returns incorrect for unequal halves', () => {
    expect(fn({ regionAreas: [30, 70] }, { areaTolerance: 0.05 }).outcome).toBe('incorrect');
  });

  it('returns incorrect when 3 regions instead of 2', () => {
    expect(fn({ regionAreas: [33, 33, 34] }, { areaTolerance: 0.05 }).outcome).toBe('incorrect');
  });
});
