/**
 * Unit tests for Mascot component — procedurally-drawn wizard character with state machine.
 */

import { describe, it, expect, vi } from 'vitest';
import { Mascot } from '@/components/Mascot';
import { makeScene } from './helpers';

describe('Mascot', () => {
  it('initializes in idle state', () => {
    const scene = makeScene();
    const mascot = new Mascot(scene, { x: 100, y: 100 });

    expect(mascot.currentState).toBe('idle');
  });

  it('transitions from idle to celebrate', () => {
    const scene = makeScene();
    const mascot = new Mascot(scene, { x: 100, y: 100 });

    mascot.setState('celebrate');

    expect(mascot.currentState).toBe('celebrate');
  });

  it('handles setState with invalid state gracefully', () => {
    const scene = makeScene();
    const mascot = new Mascot(scene, { x: 100, y: 100 });

    expect(() => mascot.setState('invalid')).not.toThrow();
  });

  it('plays celebrate animation', () => {
    const scene = makeScene();
    const mascot = new Mascot(scene, { x: 100, y: 100 });

    const spy = vi.spyOn(scene.tweens, 'add');
    mascot.celebrate();

    expect(spy).toHaveBeenCalled();
  });

  it('plays wave animation', () => {
    const scene = makeScene();
    const mascot = new Mascot(scene, { x: 100, y: 100 });

    const spy = vi.spyOn(scene.tweens, 'add');
    mascot.wave();

    expect(spy).toHaveBeenCalled();
  });

  it('can be destroyed mid-animation', () => {
    const scene = makeScene();
    const mascot = new Mascot(scene, { x: 100, y: 100 });

    mascot.celebrate();

    expect(() => mascot.destroy()).not.toThrow();
  });

  it('maintains position after state change', () => {
    const scene = makeScene();
    const mascot = new Mascot(scene, { x: 100, y: 200 });

    const x = mascot.x;
    const y = mascot.y;

    mascot.setState('encourage');

    expect(mascot.x).toBe(x);
    expect(mascot.y).toBe(y);
  });
});
