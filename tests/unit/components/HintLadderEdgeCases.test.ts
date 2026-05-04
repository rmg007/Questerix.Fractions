/**
 * Edge case tests for HintLadder state machine.
 * Tests tier progression, boundary conditions, and animation cleanup.
 */

import { describe, it, expect, vi } from 'vitest';
import { HintLadder } from '@/components/HintLadder';
import { makeScene } from './helpers';

describe.skip('HintLadder edge cases', () => {
  it('progresses through all three tiers: verbal → visual_overlay → worked_example', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    expect(ladder.currentTier).toBe(0); // verbal

    ladder.next();
    expect(ladder.currentTier).toBe(1); // visual_overlay

    ladder.next();
    expect(ladder.currentTier).toBe(2); // worked_example
  });

  it('does not advance tier when at top (no-op)', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    ladder.next();
    ladder.next();
    const topTier = ladder.currentTier;

    ladder.next(); // try to advance beyond top

    expect(ladder.currentTier).toBe(topTier); // should remain at top
  });

  it('can be destroyed mid-animation without errors', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    ladder.next(); // trigger animation

    expect(() => {
      ladder.destroy(); // destroy while tween is in flight
    }).not.toThrow();
  });

  it('handles setState with invalid state gracefully', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    // Should not throw on invalid state
    expect(() => {
      (ladder as any).setState('invalid_state');
    }).not.toThrow();
  });

  it('resets to tier 0 on reinit', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    ladder.next();
    ladder.next();
    expect(ladder.currentTier).toBe(2);

    ladder.reset();
    expect(ladder.currentTier).toBe(0);
  });

  it('animates tier transition when next() is called', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    const spy = vi.spyOn(scene.tweens, 'add');

    ladder.next();

    expect(spy).toHaveBeenCalled();
  });

  it('maintains visibility after multiple next() calls', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    expect(ladder.visible).toBe(true);

    ladder.next();
    expect(ladder.visible).toBe(true);

    ladder.next();
    expect(ladder.visible).toBe(true);
  });

  it('handles destroy after reset', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ladder: any = new (HintLadder as any)(scene, { x: 100, y: 100 });

    ladder.next();
    ladder.reset();

    expect(() => ladder.destroy()).not.toThrow();
  });
});
