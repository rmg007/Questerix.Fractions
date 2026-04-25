import { describe, it, expect } from 'vitest';
import { compareRelation } from '@/validators/compare';

describe('validator.compare.relation', () => {
  const fn = compareRelation.fn.bind(compareRelation);

  it('returns correct when student picks correct relation <', () => {
    const result = fn(
      { studentRelation: '<' },
      { leftDecimal: 0.25, rightDecimal: 0.5, trueRelation: '<' }
    );
    expect(result.outcome).toBe('correct');
  });

  it('returns correct for equal fractions', () => {
    const result = fn(
      { studentRelation: '=' },
      { leftDecimal: 0.5, rightDecimal: 0.5, trueRelation: '=' }
    );
    expect(result.outcome).toBe('correct');
  });

  it('returns incorrect for wrong relation', () => {
    const result = fn(
      { studentRelation: '>' },
      { leftDecimal: 0.25, rightDecimal: 0.5, trueRelation: '<' }
    );
    expect(result.outcome).toBe('incorrect');
  });

  it('flags MC-WHB-02 for denominator-bias misconception', () => {
    // true: 1/8 < 1/2 (left<right), student says > (thinks 8>2 means bigger)
    const result = fn(
      { studentRelation: '>' },
      { leftDecimal: 0.125, rightDecimal: 0.5, trueRelation: '<' }
    );
    expect(result.outcome).toBe('incorrect');
    expect(result.detectedMisconception).toBe('MC-WHB-02');
  });

  it('does not flag MC-WHB-02 when student says =', () => {
    const result = fn(
      { studentRelation: '=' },
      { leftDecimal: 0.125, rightDecimal: 0.5, trueRelation: '<' }
    );
    expect(result.detectedMisconception).toBeUndefined();
  });
});
