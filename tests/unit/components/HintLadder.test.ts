/**
 * HintLadder — unit tests.
 * Verifies state transitions, boundary clamping, and difficulty-level tier budgets.
 */

import { describe, expect, it } from 'vitest';
import { HintLadder } from '@/components/HintLadder';

describe('HintLadder', () => {
  describe('initialization', () => {
    it('starts at index -1 (no hint shown yet)', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.state.currentIndex).toBe(-1);
      expect(ladder.state.activeTier).toBeNull();
      expect(ladder.hasStarted).toBe(false);
    });

    it('defaults to "easy" difficulty', () => {
      const ladder = new HintLadder();
      expect(ladder.tierCount).toBe(3);
    });

    it('sets tier budget per difficulty', () => {
      expect(new HintLadder('easy').tierCount).toBe(3);
      expect(new HintLadder('medium').tierCount).toBe(2);
      expect(new HintLadder('hard').tierCount).toBe(1);
    });
  });

  describe('next() progression', () => {
    it('advances through easy tiers: verbal → visual_overlay → worked_example', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.next()).toBe('verbal');
      expect(ladder.next()).toBe('visual_overlay');
      expect(ladder.next()).toBe('worked_example');
    });

    it('clamps to last tier when exhausted', () => {
      const ladder = new HintLadder('easy');
      ladder.next(); // verbal
      ladder.next(); // visual_overlay
      ladder.next(); // worked_example
      expect(ladder.next()).toBe('worked_example'); // clamped
      expect(ladder.next()).toBe('worked_example'); // still clamped
    });

    it('respects difficulty budgets', () => {
      const medium = new HintLadder('medium');
      expect(medium.next()).toBe('verbal');
      expect(medium.next()).toBe('visual_overlay');
      expect(medium.next()).toBe('visual_overlay'); // clamped to max (2 tiers)

      const hard = new HintLadder('hard');
      expect(hard.next()).toBe('verbal');
      expect(hard.next()).toBe('verbal'); // clamped to max (1 tier)
    });
  });

  describe('state tracking', () => {
    it('updates activeTier on each next()', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.state.activeTier).toBeNull();
      ladder.next();
      expect(ladder.state.activeTier).toBe('verbal');
      ladder.next();
      expect(ladder.state.activeTier).toBe('visual_overlay');
    });

    it('marks exhausted when at last tier', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.state.exhausted).toBe(false);
      ladder.next(); // 0
      expect(ladder.state.exhausted).toBe(false);
      ladder.next(); // 1
      expect(ladder.state.exhausted).toBe(false);
      ladder.next(); // 2 (last)
      expect(ladder.state.exhausted).toBe(true);
    });

    it('stays exhausted on repeated calls', () => {
      const ladder = new HintLadder('easy');
      ladder.next();
      ladder.next();
      ladder.next();
      expect(ladder.state.exhausted).toBe(true);
      ladder.next();
      expect(ladder.state.exhausted).toBe(true);
    });

    it('currentIndex reflects internal counter', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.state.currentIndex).toBe(-1);
      ladder.next();
      expect(ladder.state.currentIndex).toBe(0);
      ladder.next();
      expect(ladder.state.currentIndex).toBe(1);
    });
  });

  describe('reset()', () => {
    it('returns to initial state', () => {
      const ladder = new HintLadder('easy');
      ladder.next();
      ladder.next();
      ladder.reset();
      expect(ladder.state.currentIndex).toBe(-1);
      expect(ladder.state.activeTier).toBeNull();
      expect(ladder.hasStarted).toBe(false);
      expect(ladder.state.exhausted).toBe(false);
    });

    it('allows re-progression after reset', () => {
      const ladder = new HintLadder('easy');
      ladder.next();
      ladder.next();
      ladder.reset();
      expect(ladder.next()).toBe('verbal');
    });
  });

  describe('tierForAttemptCount()', () => {
    it('maps attempt count to tier (1-indexed)', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.tierForAttemptCount(0)).toBeNull();
      expect(ladder.tierForAttemptCount(1)).toBe('verbal');
      expect(ladder.tierForAttemptCount(2)).toBe('visual_overlay');
      expect(ladder.tierForAttemptCount(3)).toBe('worked_example');
    });

    it('clamps to last available tier for high attempt counts', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.tierForAttemptCount(5)).toBe('worked_example');
      expect(ladder.tierForAttemptCount(100)).toBe('worked_example');
    });

    it('respects difficulty budgets', () => {
      const medium = new HintLadder('medium');
      expect(medium.tierForAttemptCount(1)).toBe('verbal');
      expect(medium.tierForAttemptCount(2)).toBe('visual_overlay');
      expect(medium.tierForAttemptCount(3)).toBe('visual_overlay'); // clamped

      const hard = new HintLadder('hard');
      expect(hard.tierForAttemptCount(1)).toBe('verbal');
      expect(hard.tierForAttemptCount(2)).toBe('verbal'); // clamped
    });

    it('rejects negative attempt counts', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.tierForAttemptCount(-1)).toBeNull();
      expect(ladder.tierForAttemptCount(-5)).toBeNull();
    });
  });

  describe('boundary conditions', () => {
    it('single-tier budget (hard)', () => {
      const ladder = new HintLadder('hard');
      expect(ladder.tierCount).toBe(1);
      expect(ladder.next()).toBe('verbal');
      expect(ladder.state.exhausted).toBe(true);
      expect(ladder.next()).toBe('verbal');
    });

    it('hasStarted is false initially, true after first next()', () => {
      const ladder = new HintLadder('easy');
      expect(ladder.hasStarted).toBe(false);
      ladder.next();
      expect(ladder.hasStarted).toBe(true);
    });
  });
});
