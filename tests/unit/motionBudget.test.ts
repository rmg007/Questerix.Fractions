/**
 * Tests for the per-surface motion budget (ux-elevation §5 / T0).
 */

import { describe, expect, it, vi } from 'vitest';
import { createMotionBudget, SURFACE_BUDGET } from '@/lib/motionBudget';

describe('SURFACE_BUDGET defaults', () => {
  it('matches the §5 budget table', () => {
    expect(SURFACE_BUDGET.menu).toBe(3);
    expect(SURFACE_BUDGET.loading).toBe(2);
    expect(SURFACE_BUDGET['question-idle']).toBe(2);
    expect(SURFACE_BUDGET['question-reaction']).toBe(1);
    expect(SURFACE_BUDGET.trophy).toBe(3);
    expect(SURFACE_BUDGET['world-map']).toBe(3);
  });
});

describe('createMotionBudget — full motion', () => {
  it('grants up to the cap', () => {
    const budget = createMotionBudget('menu');
    const a = budget.acquire('path-march');
    const b = budget.acquire('quest-idle');
    const c = budget.acquire('button-affordance');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(c).not.toBeNull();
    expect(budget.isFull()).toBe(true);
  });

  it('denies a fourth low-priority request when full', () => {
    const budget = createMotionBudget('menu');
    budget.acquire('a');
    budget.acquire('b');
    budget.acquire('c');
    const d = budget.acquire('d', 'low');
    expect(d).toBeNull();
  });

  it('evicts the lowest-priority slot for a higher-priority request', () => {
    const budget = createMotionBudget('menu');
    const onEvict = vi.fn();
    budget.acquire('low-1', 'low', onEvict);
    budget.acquire('normal-1', 'normal');
    budget.acquire('normal-2', 'normal');
    const high = budget.acquire('high-1', 'high');
    expect(high).not.toBeNull();
    expect(onEvict).toHaveBeenCalledOnce();
    expect(budget.active().some((s) => s.label === 'low-1')).toBe(false);
  });

  it('release() frees a slot', () => {
    const budget = createMotionBudget('question-idle');
    const h = budget.acquire('idle-pulse');
    expect(h).not.toBeNull();
    budget.acquire('submit-affordance');
    expect(budget.isFull()).toBe(true);
    budget.release(h!);
    expect(budget.isFull()).toBe(false);
    expect(budget.acquire('new')).not.toBeNull();
  });

  it('release() is idempotent', () => {
    const budget = createMotionBudget('menu');
    const h = budget.acquire('a');
    budget.release(h!);
    budget.release(h!); // no-op
    expect(budget.active()).toHaveLength(0);
  });
});

describe('createMotionBudget — reduced motion', () => {
  it('caps the budget at 0 and denies all acquisitions', () => {
    const budget = createMotionBudget('menu', true);
    expect(budget.budget()).toBe(0);
    expect(budget.acquire('any', 'high')).toBeNull();
  });

  it('reports isFull() correctly at 0 cap', () => {
    const budget = createMotionBudget('trophy', true);
    expect(budget.isFull()).toBe(true);
  });
});

describe('createMotionBudget — diagnostics', () => {
  it('preserves caller labels on active()', () => {
    const budget = createMotionBudget('trophy');
    budget.acquire('confetti');
    budget.acquire('quest-cheer');
    budget.acquire('button-affordance');
    const labels = budget
      .active()
      .map((s) => s.label)
      .sort();
    expect(labels).toEqual(['button-affordance', 'confetti', 'quest-cheer']);
  });
});
