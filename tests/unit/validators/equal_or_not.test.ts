import { describe, it, expect } from 'vitest';
import { equalOrNotAreaTolerance } from '@/validators/equal_or_not';

describe('validator.equal_or_not.areaTolerance', () => {
  const fn = equalOrNotAreaTolerance.fn.bind(equalOrNotAreaTolerance);

  it('returns correct when student says equal and it is equal', () => {
    const result = fn({ studentAnswer: true }, { correctAnswer: true });
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns correct when student says not-equal and it is not equal', () => {
    const result = fn({ studentAnswer: false }, { correctAnswer: false });
    expect(result.outcome).toBe('correct');
  });

  it('returns incorrect when student says equal but it is not', () => {
    const result = fn({ studentAnswer: true }, { correctAnswer: false });
    expect(result.outcome).toBe('incorrect');
  });

  it('flags MC-EOL-01 when student says equal on unequal partition', () => {
    // per misconceptions.md §3.2 MC-EOL-01
    const result = fn({ studentAnswer: true }, { correctAnswer: false });
    expect(result.detectedMisconception).toBe('MC-EOL-01');
  });

  it('does not flag MC-EOL-01 when student wrongly says not-equal', () => {
    const result = fn({ studentAnswer: false }, { correctAnswer: true });
    expect(result.detectedMisconception).toBeUndefined();
  });

  it('uses explicit misconceptionOnWrong override', () => {
    const result = fn(
      { studentAnswer: false },
      { correctAnswer: true, misconceptionOnWrong: 'MC-EOL-02' }
    );
    expect(result.detectedMisconception).toBe('MC-EOL-02');
  });
});
