/**
 * Tests for the motion language defaults (ux-elevation §5 / T0).
 */

import { describe, expect, it } from 'vitest';
import {
  MOTION,
  type MotionRole,
  resolve,
  isReducedMotionPermitted,
  ACTION_APPEAR_EASE,
  REACTION_FADE_EASE,
} from '@/scenes/utils/easings';

describe('MOTION defaults', () => {
  it('defines exactly the five named roles', () => {
    const keys = Object.keys(MOTION).sort();
    expect(keys).toEqual(['action', 'affordance', 'anticipation', 'reaction', 'reset']);
  });

  it('Affordance loops indefinitely', () => {
    expect(MOTION.affordance.loop).toBe(true);
  });

  it('Anticipation is 60–120 ms', () => {
    expect(MOTION.anticipation.durationRange).toEqual([60, 120]);
    expect(MOTION.anticipation.duration).toBeGreaterThanOrEqual(60);
    expect(MOTION.anticipation.duration).toBeLessThanOrEqual(120);
  });

  it('Reaction is 280–600 ms with Back.easeOut default', () => {
    expect(MOTION.reaction.ease).toBe('Back.easeOut');
    expect(MOTION.reaction.durationRange).toEqual([280, 600]);
  });

  it('Reset uses linear easing at 200 ms', () => {
    expect(MOTION.reset.ease).toBe('Linear');
    expect(MOTION.reset.duration).toBe(200);
  });

  it('exposes alternate Action and Reaction easings as named exports', () => {
    expect(ACTION_APPEAR_EASE).toBe('Back.easeOut');
    expect(REACTION_FADE_EASE).toBe('Quad.easeOut');
  });
});

describe('resolve()', () => {
  const roles: MotionRole[] = ['affordance', 'anticipation', 'action', 'reaction', 'reset'];

  it('returns canonical spec when reduced motion is OFF', () => {
    for (const role of roles) {
      const r = resolve(role, false);
      expect(r.duration).toBe(MOTION[role].duration);
      expect(r.ease).toBe(MOTION[role].ease);
    }
  });

  it('returns 0 ms duration and clears loop when reduced motion is ON', () => {
    for (const role of roles) {
      const r = resolve(role, true);
      expect(r.duration).toBe(0);
      expect(r.loop).toBe(false);
    }
  });
});

describe('isReducedMotionPermitted', () => {
  it('permits all roles when reduced motion is OFF', () => {
    expect(isReducedMotionPermitted('affordance', false)).toBe(true);
    expect(isReducedMotionPermitted('reaction', false)).toBe(true);
    expect(isReducedMotionPermitted('reset', false)).toBe(true);
  });

  it('only permits Reaction state-change under reduced motion', () => {
    expect(isReducedMotionPermitted('reaction', true)).toBe(true);
    expect(isReducedMotionPermitted('affordance', true)).toBe(false);
    expect(isReducedMotionPermitted('anticipation', true)).toBe(false);
    expect(isReducedMotionPermitted('action', true)).toBe(false);
    expect(isReducedMotionPermitted('reset', true)).toBe(false);
  });
});
