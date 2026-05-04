import { describe, it, expect } from 'vitest';
import { orderSequence, orderAcceptable, orderWithRule } from '@/validators/order';

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
describe('validator.order.acceptableOrders', () => {
  const { fn } = orderAcceptable;
  const payload = {
    acceptableOrders: [
      ['f1', 'f2', 'f3'],
      ['f1', 'f3', 'f2'],
    ],
  };

  it('returns correct for any acceptable order', () => {
    expect(fn({ studentSequence: ['f1', 'f2', 'f3'] }, payload).outcome).toBe('correct');
    expect(fn({ studentSequence: ['f1', 'f3', 'f2'] }, payload).outcome).toBe('correct');
  });

  it('returns partial for one swap off from best match', () => {
    // ['f2', 'f1', 'f3'] is 1 swap from ['f1', 'f2', 'f3']
    const result = fn({ studentSequence: ['f2', 'f1', 'f3'] }, payload);
    expect(result.outcome).toBe('partial');
    expect(result.feedback).toBe('one_swap_off');
  });

  it('returns partial for two swaps off from best match', () => {
    // ['f3', 'f2', 'f1'] is 3 swaps from ['f1', 'f2', 'f3']
    // but only 2 swaps from ['f1', 'f3', 'f2'] (f1-f3, f3-f2) Wait...
    // f1, f3, f2 -> f3, f1, f2 (1) -> f3, f2, f1 (2)
    const result = fn({ studentSequence: ['f3', 'f2', 'f1'] }, payload);
    expect(result.outcome).toBe('partial');
    expect(result.feedback).toBe('two_swaps');
  });

  it('returns incorrect for no match and too many swaps', () => {
    const bigPayload = { acceptableOrders: [['f1', 'f2', 'f3', 'f4', 'f5']] };
    const result = fn({ studentSequence: ['f5', 'f4', 'f3', 'f2', 'f1'] }, bigPayload);
    expect(result.outcome).toBe('incorrect');
    expect(result.feedback).toBe('no_match');
  });
});

describe('validator.order.withRuleExplanation', () => {
  const { fn } = orderWithRule;
  const payload = {
    acceptableOrders: [['f1', 'f2']],
    postStep: { correctRule: 'ascending' },
  };

  it('returns correct for correct order and correct rule', () => {
    const result = fn({ sequence: ['f1', 'f2'], rule: 'ascending' }, payload);
    expect(result.outcome).toBe('correct');
    expect(result.score).toBe(1);
  });

  it('returns partial for correct order but wrong rule', () => {
    const result = fn({ sequence: ['f1', 'f2'], rule: 'descending' }, payload);
    expect(result.outcome).toBe('partial');
    expect(result.score).toBe(0.5);
    expect(result.feedback).toBe('rule_incorrect');
  });

  it('returns incorrect for wrong order', () => {
    const result = fn({ sequence: ['f2', 'f1'], rule: 'ascending' }, payload);
    expect(result.outcome).toBe('incorrect');
    expect(result.score).toBe(0);
    expect(result.feedback).toBe('order_incorrect');
  });
});
