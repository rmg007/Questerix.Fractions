import { describe, it, expect } from 'vitest';
import { explainYourOrderSequence } from '@/validators/explain_your_order';

describe('validator.explain_your_order.sequence', () => {
  const fn = explainYourOrderSequence.fn.bind(explainYourOrderSequence);
  const correct = { correctSequence: ['f1', 'f2', 'f3', 'f4'] };

  // ── Correct cases ──────────────────────────────────────────────────────────

  it('returns correct for exact sequence with no justification required', () => {
    const result = fn({ studentSequence: ['f1', 'f2', 'f3', 'f4'] }, correct);
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns correct for exact sequence with matching justification', () => {
    const result = fn(
      { studentSequence: ['f1', 'f2', 'f3', 'f4'], justification: 'size' },
      { correctSequence: ['f1', 'f2', 'f3', 'f4'], acceptedJustifications: ['size', 'parts'] }
    );
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  // ── Partial cases ──────────────────────────────────────────────────────────

  it('returns partial for one swap off (Kendall tau = 1)', () => {
    // f2 and f3 swapped → 1 swap
    const result = fn({ studentSequence: ['f1', 'f3', 'f2', 'f4'] }, correct);
    expect(result.outcome).toBe('partial');
    expect(result.score).toBe(0.5);
    expect(result.feedback).toBe('one_swap_off');
  });

  it('returns partial for two swaps off', () => {
    // f1↔f2 and f3↔f4 → 2 independent swaps
    const result = fn({ studentSequence: ['f2', 'f1', 'f4', 'f3'] }, correct);
    expect(result.outcome).toBe('partial');
    expect(result.score).toBe(0.25);
    expect(result.feedback).toBe('two_swaps');
  });

  it('returns partial when sequence is exact but justification is wrong', () => {
    const result = fn(
      { studentSequence: ['f1', 'f2', 'f3', 'f4'], justification: 'colour' },
      { correctSequence: ['f1', 'f2', 'f3', 'f4'], acceptedJustifications: ['size', 'parts'] }
    );
    expect(result.outcome).toBe('partial');
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
    expect(result.feedback).toBe('wrong_justification');
    expect(result.detectedMisconception).toBe('MC-ORD-01');
  });

  it('returns partial when sequence is exact and justification missing but required', () => {
    const result = fn(
      { studentSequence: ['f1', 'f2', 'f3', 'f4'] },
      { correctSequence: ['f1', 'f2', 'f3', 'f4'], acceptedJustifications: ['size'] }
    );
    expect(result.outcome).toBe('partial');
  });

  // ── Incorrect cases ────────────────────────────────────────────────────────

  it('returns incorrect for fully reversed sequence', () => {
    const result = fn({ studentSequence: ['f4', 'f3', 'f2', 'f1'] }, correct);
    expect(result.outcome).toBe('incorrect');
    expect(result.score).toBe(0);
  });

  it('returns incorrect for length mismatch', () => {
    const result = fn({ studentSequence: ['f1', 'f2'] }, correct);
    expect(result.outcome).toBe('incorrect');
    expect(result.feedback).toBe('length_mismatch');
    expect(result.score).toBe(0);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('returns correct for single-element sequence', () => {
    const result = fn(
      { studentSequence: ['f1'] },
      { correctSequence: ['f1'] }
    );
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('ignores justification when acceptedJustifications is empty array', () => {
    const result = fn(
      { studentSequence: ['f1', 'f2', 'f3', 'f4'], justification: 'anything' },
      { correctSequence: ['f1', 'f2', 'f3', 'f4'], acceptedJustifications: [] }
    );
    // Empty acceptedJustifications = not required → exact sequence = correct
    expect(result.outcome).toBe('correct');
  });

  it('validator metadata is correct', () => {
    expect(explainYourOrderSequence.id).toBe('validator.explain_your_order.sequence');
    expect(explainYourOrderSequence.archetype).toBe('explain_your_order');
    expect(explainYourOrderSequence.variant).toBe('sequence');
  });
});
