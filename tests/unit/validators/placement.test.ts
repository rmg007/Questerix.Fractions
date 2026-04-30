import { describe, it, expect } from 'vitest';
import { placementSnapTolerance, placementSnap8 } from '@/validators/placement';

const baseExpected = { targetDecimal: 0.5, exactTolerance: 0.05, closeTolerance: 0.15 };

describe('validator.placement.snapTolerance', () => {
  const fn = placementSnapTolerance.fn.bind(placementSnapTolerance);

  it('returns correct within exactTolerance', () => {
    expect(fn({ studentPlacedDecimal: 0.52 }, baseExpected).outcome).toBe('correct');
  });

  it('returns partial within closeTolerance', () => {
    expect(fn({ studentPlacedDecimal: 0.62 }, baseExpected).outcome).toBe('partial');
  });

  it('returns incorrect beyond closeTolerance', () => {
    expect(fn({ studentPlacedDecimal: 0.1 }, baseExpected).outcome).toBe('incorrect');
  });

  it('flags MC-PRX-02 when target >0.5 and student places <0.5', () => {
    // per misconceptions.md §3.4 MC-PRX-02
    const result = fn(
      { studentPlacedDecimal: 0.3 },
      { targetDecimal: 0.75, exactTolerance: 0.05, closeTolerance: 0.15 }
    );
    expect(result.detectedMisconception).toBe('MC-PRX-02');
  });

  it('does not flag MC-PRX-02 for normal miss', () => {
    const result = fn({ studentPlacedDecimal: 0.8 }, baseExpected);
    expect(result.detectedMisconception).toBeUndefined();
  });
});

describe('validator.placement.snap8', () => {
  const fn = placementSnap8.fn.bind(placementSnap8);

  it('uses 0.0625 exactTolerance — placed outside exact but inside close is partial', () => {
    // target 0.5, placed 0.57 → error 0.07 > 0.0625, < closeTolerance(0.15) → partial
    const result = fn(
      { studentPlacedDecimal: 0.57 },
      { targetDecimal: 0.5, exactTolerance: 0.1, closeTolerance: 0.15 }
    );
    expect(result.outcome).toBe('partial');
  });

  it('returns correct when error is within 0.0625', () => {
    // error = 0.04 < 0.0625 → correct
    const result = fn(
      { studentPlacedDecimal: 0.54 },
      { targetDecimal: 0.5, exactTolerance: 0.1, closeTolerance: 0.2 }
    );
    expect(result.outcome).toBe('correct');
  });

  it('returns incorrect beyond closeTolerance', () => {
    const result = fn(
      { studentPlacedDecimal: 0.1 },
      { targetDecimal: 0.5, exactTolerance: 0.1, closeTolerance: 0.15 }
    );
    expect(result.outcome).toBe('incorrect');
  });
});
