import { describe, it, expect } from 'vitest';
import { snapMatchAllPairs } from '@/validators/snap_match';

describe('validator.snap_match.allPairs', () => {
  const fn = snapMatchAllPairs.fn.bind(snapMatchAllPairs);
  const expected = {
    expectedPairs: [
      ['word-half', 'shape-circle'],
      ['word-third', 'shape-rect'],
    ] as Array<[string, string]>,
  };

  it('returns correct for all correct pairs', () => {
    const result = fn(
      {
        studentPairs: [
          ['word-half', 'shape-circle'],
          ['word-third', 'shape-rect'],
        ],
      },
      expected
    );
    expect(result.outcome).toBe('correct');
  });

  it('returns correct for reversed pair order within each pair', () => {
    const result = fn(
      {
        studentPairs: [
          ['shape-circle', 'word-half'],
          ['word-third', 'shape-rect'],
        ],
      },
      expected
    );
    expect(result.outcome).toBe('correct');
  });

  it('returns incorrect for wrong pairing', () => {
    const result = fn(
      {
        studentPairs: [
          ['word-half', 'shape-rect'],
          ['word-third', 'shape-circle'],
        ],
      },
      expected
    );
    expect(result.outcome).toBe('incorrect');
  });

  it('returns incorrect for incomplete pairs', () => {
    const result = fn({ studentPairs: [['word-half', 'shape-circle']] }, expected);
    expect(result.outcome).toBe('incorrect');
    expect(result.feedback).toBe('incomplete');
  });
});
