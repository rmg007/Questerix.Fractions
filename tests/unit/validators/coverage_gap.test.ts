import { describe, it, expect } from 'vitest';
import { benchmarkClosest } from '@/validators/benchmark';
import { compareGreaterThan } from '@/validators/compare';
import { snapMatchEquivalence } from '@/validators/snap_match';
import * as Validators from '@/validators';

describe('Coverage Gap Validators', () => {
  describe('benchmarkClosest', () => {
    const { fn } = benchmarkClosest;
    it('returns correct for matching benchmark', () => {
      expect(fn({ studentBenchmark: 'half' }, { correctBenchmark: 'half' }).outcome).toBe(
        'correct'
      );
    });
    it('returns incorrect for non-matching benchmark', () => {
      expect(fn({ studentBenchmark: 'zero' }, { correctBenchmark: 'half' }).outcome).toBe(
        'incorrect'
      );
    });
  });

  describe('compareGreaterThan', () => {
    const { fn } = compareGreaterThan;
    it('returns correct for matching choice', () => {
      expect(fn({ studentChoice: 'A' }, { correctChoice: 'A' }).outcome).toBe('correct');
    });
    it('returns incorrect for non-matching choice', () => {
      expect(fn({ studentChoice: 'B' }, { correctChoice: 'A' }).outcome).toBe('incorrect');
    });
  });

  describe('snapMatchEquivalence', () => {
    const { fn } = snapMatchEquivalence;
    it('returns correct for equivalent decimals', () => {
      expect(fn({ snappedDecimal: 0.5 }, { targetDecimal: 0.5 }).outcome).toBe('correct');
    });
    it('returns correct for decimals within tolerance', () => {
      expect(fn({ snappedDecimal: 0.5000000001 }, { targetDecimal: 0.5 }).outcome).toBe('correct');
    });
    it('returns incorrect for different decimals', () => {
      expect(fn({ snappedDecimal: 0.6 }, { targetDecimal: 0.5 }).outcome).toBe('incorrect');
    });
  });

  describe('Barrel Export (index.ts)', () => {
    it('exports validatorRegistry', () => {
      expect(Validators.validatorRegistry).toBeDefined();
    });
  });
});
