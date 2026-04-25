import { describe, it, expect } from 'vitest';
import { labelMatchTarget } from '@/validators/label';

describe('validator.label.matchTarget', () => {
  const fn = labelMatchTarget.fn.bind(labelMatchTarget);
  const expected = {
    expectedLabelForRegion: { 'r1': 'label-half', 'r2': 'label-half' },
  };

  it('returns correct when all mappings are correct', () => {
    const result = fn(
      { studentMappings: [{ labelId: 'label-half', regionId: 'r1' }, { labelId: 'label-half', regionId: 'r2' }] },
      expected
    );
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns incorrect for wrong label on region', () => {
    const result = fn(
      { studentMappings: [{ labelId: 'label-third', regionId: 'r1' }, { labelId: 'label-half', regionId: 'r2' }] },
      expected
    );
    expect(result.outcome).toBe('incorrect');
  });

  it('returns incorrect for unmapped region', () => {
    const result = fn(
      { studentMappings: [{ labelId: 'label-half', regionId: 'r1' }] },
      expected
    );
    expect(result.outcome).toBe('incorrect');
  });

  it('score reflects partial correctness', () => {
    // 1 of 2 wrong → score 0.5
    const result = fn(
      { studentMappings: [{ labelId: 'label-half', regionId: 'r1' }, { labelId: 'label-third', regionId: 'r2' }] },
      expected
    );
    expect(result.score).toBe(0.5);
  });
});
