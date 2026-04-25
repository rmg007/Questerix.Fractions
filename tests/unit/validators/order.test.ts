import { describe, it, expect } from 'vitest';
import { orderSequence } from '@/validators/order';

describe('validator.order.sequence', () => {
  const fn = orderSequence.fn.bind(orderSequence);
  const correct = { correctSequence: ['f1', 'f2', 'f3', 'f4'] };

  it('returns correct for exact sequence', () => {
    const result = fn({ studentSequence: ['f1', 'f2', 'f3', 'f4'] }, correct);
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns partial for one swap off (Kendall tau = 1)', () => {
    // f2 and f3 swapped → 1 swap
    const result = fn({ studentSequence: ['f1', 'f3', 'f2', 'f4'] }, correct);
    expect(result.outcome).toBe('partial');
  });

  it('returns incorrect for multiple swaps', () => {
    // reverse order → max swaps
    const result = fn({ studentSequence: ['f4', 'f3', 'f2', 'f1'] }, correct);
    expect(result.outcome).toBe('incorrect');
  });

  it('returns incorrect for length mismatch', () => {
    const result = fn({ studentSequence: ['f1', 'f2'] }, correct);
    expect(result.outcome).toBe('incorrect');
    expect(result.feedback).toBe('length_mismatch');
  });
});
