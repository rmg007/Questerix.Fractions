/**
 * Unit tests for Mascot component — procedurally-drawn wizard character with state machine.
 *
 * SKIP: legacy stub tests use a flat-options API (`new Mascot(scene, { x, y })`)
 * + properties (`mascot.currentState`, `mascot.celebrate()`, `mascot.wave()`)
 * that do not exist on the current Mascot (it uses sub-modules under
 * `src/components/mascot/` and exposes `setState` only). Mascot also pulls
 * in real Phaser graphics/tween chains at construction that need a Phaser
 * mock layer beyond the simple stub helpers. Re-enable after rewriting
 * against the post-Phase-4.4 API.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class Container {
    constructor(_scene: unknown) {}
    add = vi.fn();
    setDepth = vi.fn().mockReturnThis();
    setVisible = vi.fn().mockReturnThis();
    setAlpha = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }
  class Scene {}
  return {
    Scene,
    GameObjects: { Container, Text: class {}, Rectangle: class {} },
    Geom: { Rectangle: { Contains: () => false } },
    Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
    default: { Scene },
  };
});

import { Mascot } from '@/components/Mascot';
import { makeScene } from './helpers';

describe.skip('Mascot', () => {
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
