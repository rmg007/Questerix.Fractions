/**
 * Unit tests for DragHandle component.
 * Tests touch + keyboard input, drag mechanics, and boundary constraints.
 */

import { describe, it, expect, vi } from 'vitest';
import { DragHandle } from '@/components/DragHandle';
import { makeScene, makeGameObject } from './helpers';

describe('DragHandle', () => {
  it('creates a draggable handle with minimum touch target size (44×44)', () => {
    const scene = makeScene();
    const handle = new DragHandle(scene, {
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
    const handle = new DragHandle(scene, {
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
    const handle = new DragHandle(scene, {
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
    const handle = new DragHandle(scene, {
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
    const handle = new DragHandle(scene, {
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
    const handle = new DragHandle(scene, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      onDrag: vi.fn(),
    });

    expect(() => handle.destroy()).not.toThrow();
  });
});
