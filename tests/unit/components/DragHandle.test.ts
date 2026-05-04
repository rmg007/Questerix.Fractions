/**
 * Unit tests for DragHandle component.
 * Tests touch + keyboard input, drag mechanics, and boundary constraints.
 *
 * SKIP: legacy stub tests written against an aspirational API
 * (`handle.container`, `handle.width`, `handle.handleKeyInput`,
 * `handle.onPointerDown`, `setPosition` callback semantics) that
 * does not match the real `DragHandle` (config: `trackLength`,
 * `axis`, `minPos`, `maxPos`, `onMove`, `onCommit`). The component
 * also requires real Phaser interactive/tween/keyboard wiring at
 * construction. Re-enable after rewriting against the current API
 * with a proper Phaser mock layer.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class Scene {}
  return {
    Scene,
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {}, Arc: class {} },
    Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
    Tweens: { Tween: class {} },
    Input: { Pointer: class {} },
    default: { Scene },
  };
});

import { DragHandle } from '@/components/DragHandle';
import { makeScene } from './helpers';

describe.skip('DragHandle', () => {
  it('creates a draggable handle with minimum touch target size (44×44)', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle: any = new (DragHandle as any)(scene, {
      x: 100,
      y: 100,
      width: 44,
      height: 44,
      onDrag: vi.fn(),
    });

    expect(handle.container).toBeDefined();
    // Touch target should be at least 44×44
    expect(handle.width).toBeGreaterThanOrEqual(44);
    expect(handle.height).toBeGreaterThanOrEqual(44);
  });

  it('calls onDrag callback when position changes', () => {
    const onDrag = vi.fn();
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle: any = new (DragHandle as any)(scene, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      onDrag,
    });

    // Simulate drag movement
    handle.setPosition(150, 100);

    expect(onDrag).toHaveBeenCalled();
  });

  it('constrains drag beyond bounds', () => {
    const onDrag = vi.fn();
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle: any = new (DragHandle as any)(scene, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      minX: 50,
      maxX: 200,
      onDrag,
    });

    // Try to move beyond maxX
    handle.setPosition(300, 100);

    // Should be clamped to maxX
    expect(handle.x).toBeLessThanOrEqual(200);
  });

  it('responds to keyboard arrow keys (left/right)', () => {
    const onDrag = vi.fn();
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle: any = new (DragHandle as any)(scene, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      keyStepSize: 10,
      onDrag,
    });

    // Simulate arrow key press (would be handled by Phaser input)
    const startX = handle.x;
    handle.handleKeyInput('right', 10);

    // Position should change
    expect(handle.x).toBeGreaterThanOrEqual(startX);
  });

  it('handles multi-touch collision gracefully', () => {
    const onDrag = vi.fn();
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle: any = new (DragHandle as any)(scene, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      onDrag,
    });

    // Simultaneous pointer events should not cause crashes
    expect(() => {
      handle.onPointerDown?.();
      handle.onPointerDown?.(); // second touch
      handle.onPointerUp?.();
    }).not.toThrow();
  });

  it('destroys without errors', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle: any = new (DragHandle as any)(scene, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      onDrag: vi.fn(),
    });

    expect(() => handle.destroy()).not.toThrow();
  });
});
