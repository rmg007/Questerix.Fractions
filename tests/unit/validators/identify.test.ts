import { describe, it, expect } from 'vitest';
import { identifyExactIndex } from '@/validators/identify';

describe('validator.identify.exactIndex', () => {
  const fn = identifyExactIndex.fn.bind(identifyExactIndex);

  it('returns correct for matching index', () => {
    const result = fn({ selectedIndex: 2 }, { targetIndex: 2 });
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns incorrect for wrong index', () => {
    const result = fn({ selectedIndex: 0 }, { targetIndex: 2 });
    expect(result.outcome).toBe('incorrect');
  });

  it('flags misconception when distractor mapping present', () => {
    const result = fn(
      { selectedIndex: 1 },
      {
        targetIndex: 0,
        distractorMisconceptions: { 1: 'MC-WHB-01' },
      }
    );
    expect(result.outcome).toBe('incorrect');
    expect(result.detectedMisconception).toBe('MC-WHB-01');
  });

  it('does not flag misconception for unmapped distractor', () => {
    const result = fn(
      { selectedIndex: 3 },
      { targetIndex: 0, distractorMisconceptions: { 1: 'MC-WHB-01' } }
    );
    expect(result.detectedMisconception).toBeUndefined();
  });
});
